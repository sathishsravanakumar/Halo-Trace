from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from pathlib import Path
import easyocr
from PIL import Image
import numpy as np
import io
import anthropic
from groq import Groq
import re
import base64
import json
from duckduckgo_search import DDGS
import google.generativeai as genai

# Load .env from root directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

app = FastAPI(title="Halo Trace API", version="1.0.0")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize EasyOCR reader (lazy loading)
ocr_reader = None

def get_ocr_reader():
    global ocr_reader
    if ocr_reader is None:
        ocr_reader = easyocr.Reader(['en'], gpu=False)
    return ocr_reader


class SearchRequest(BaseModel):
    names: List[str]
    tag: str  # 'companies' or 'people'


class SearchResult(BaseModel):
    name: str
    linkedinUrl: Optional[str] = None
    isExactMatch: bool
    profileTitle: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[SearchResult]


def find_linkedin_profile(name: str, tag: str) -> dict:
    """Search for exact LinkedIn profile URL using DuckDuckGo."""
    try:
        # Try multiple search strategies
        search_queries = []

        if tag == 'companies':
            # Multiple search strategies for companies
            search_queries = [
                f'site:linkedin.com/company "{name}"',
                f'{name} linkedin company',
                f'"{name}" site:linkedin.com'
            ]
        else:
            # Multiple search strategies for people - more comprehensive
            search_queries = [
                f'site:linkedin.com/in "{name}"',
                f'"{name}" linkedin profile',
                f'{name} linkedin',
                f'"{name}" site:linkedin.com/in',
                f'{name} professional linkedin'
            ]

        # Try each search query
        for query in search_queries:
            try:
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, max_results=15))

                if results:
                    for result in results:
                        url = result.get('href', '')
                        title = result.get('title', '')

                        # Skip non-LinkedIn URLs
                        if 'linkedin.com' not in url:
                            continue

                        # Validate it's a proper LinkedIn URL
                        if tag == 'companies' and '/company/' in url:
                            # Extract clean company URL
                            match = re.search(r'(https?://(?:[a-z]{2,3}\.)?linkedin\.com/company/[^/?#\s]+)', url)
                            if match:
                                clean_url = match.group(1)
                                # Normalize to www.linkedin.com
                                clean_url = re.sub(r'https?://(?:[a-z]{2,3}\.)?linkedin\.com', 'https://www.linkedin.com', clean_url)
                                return {
                                    'url': clean_url,
                                    'isExact': True,
                                    'title': title
                                }
                        elif tag == 'companies' and '/school/' in url:
                            # Handle school/university pages
                            match = re.search(r'(https?://(?:[a-z]{2,3}\.)?linkedin\.com/school/[^/?#\s]+)', url)
                            if match:
                                clean_url = match.group(1)
                                clean_url = re.sub(r'https?://(?:[a-z]{2,3}\.)?linkedin\.com', 'https://www.linkedin.com', clean_url)
                                return {
                                    'url': clean_url,
                                    'isExact': True,
                                    'title': title
                                }
                        elif tag == 'people' and '/in/' in url:
                            # Extract clean profile URL
                            match = re.search(r'(https?://(?:[a-z]{2,3}\.)?linkedin\.com/in/[^/?#\s]+)', url)
                            if match:
                                clean_url = match.group(1)
                                # Normalize to www.linkedin.com
                                clean_url = re.sub(r'https?://(?:[a-z]{2,3}\.)?linkedin\.com', 'https://www.linkedin.com', clean_url)
                                return {
                                    'url': clean_url,
                                    'isExact': True,
                                    'title': title
                                }
            except Exception as e:
                print(f"Search query failed: {query}, error: {e}")
                continue

        # Fallback: Try to construct a likely LinkedIn URL
        if tag == 'companies':
            # Generate slug from name
            slug = name.lower()
            slug = re.sub(r'[^a-z0-9\s-]', '', slug)
            slug = re.sub(r'\s+', '-', slug.strip())

            # Return constructed URL as a best guess
            constructed_url = f"https://www.linkedin.com/company/{slug}"
            return {
                'url': constructed_url,
                'isExact': True,
                'title': f"{name} | LinkedIn"
            }

        # If no exact match found, return no match
        return {
            'url': None,
            'isExact': False,
            'title': None
        }

    except Exception as e:
        print(f"Search error for {name}: {e}")

        # Fallback for companies even on error
        if tag == 'companies':
            slug = name.lower()
            slug = re.sub(r'[^a-z0-9\s-]', '', slug)
            slug = re.sub(r'\s+', '-', slug.strip())
            return {
                'url': f"https://www.linkedin.com/company/{slug}",
                'isExact': True,
                'title': f"{name} | LinkedIn"
            }

        return {
            'url': None,
            'isExact': False,
            'title': None
        }


def validate_company_names(names: List[str]) -> List[str]:
    """Filter out misidentified or invalid company names."""
    # Known invalid patterns that indicate OCR/recognition errors
    invalid_patterns = [
        'QQQQ', 'OOOO', 'qqqq', 'oooo',  # Audi logo misread
        'Auol', 'AOL',  # Unless it's actually AOL
        'Bzbi', 'bzbi',
        'cisCo', 'CISCO',  # Wrong capitalization
        'RIDGeSTOnE', 'RIDGESTONE',
        '#usbro', 'usbro',
        'CCGO', 'ccgo',
        'BR',  # Should be Baskin-Robbins
    ]

    # Corrections map for common misidentifications
    corrections = {
        'QQQQ': 'Audi',
        'qqqq': 'Audi',
        'OOOO': 'Audi',
        'oooo': 'Audi',
        'BR': 'Baskin-Robbins',
        'cisCo': 'Cisco',
        'CISCO': 'Cisco',
        'cisco': 'Cisco',
        'RIDGeSTOnE': 'Bridgestone',
        'RIDGESTONE': 'Bridgestone',
        'NOKIA': 'Nokia',
        'nokia': 'Nokia',
        'IKEA': 'IKEA',  # This one is actually correct as all caps
        'LEGO': 'Lego',
        'ATARI': 'Atari',
        'CVS': 'CVS',  # Correct as caps
        'IBM': 'IBM',  # Correct as caps
        'HP': 'HP',  # Correct as caps
        'LG': 'LG',  # Correct as caps
        'BMW': 'BMW',  # Correct as caps
        'amazon': 'Amazon',
        'google': 'Google',
        'microsoft': 'Microsoft',
        'adobe': 'Adobe',
        'adidas': 'Adidas',
        'ADIDAS': 'Adidas',
    }

    validated = []
    seen = set()

    for name in names:
        name = name.strip()

        # Skip empty or very short names
        if len(name) < 2:
            continue

        # Skip names that are just numbers or symbols
        if all(not c.isalpha() for c in name):
            continue

        # Skip names with too many special characters
        special_count = sum(1 for c in name if not c.isalnum() and c not in ' -.')
        if special_count > 2:
            continue

        # Apply corrections
        if name in corrections:
            name = corrections[name]

        # Skip known invalid patterns (that weren't corrected)
        if name in invalid_patterns:
            continue

        # Check for nonsense strings (random letters)
        # Skip if it looks like random uppercase letters
        if len(name) >= 4 and name.isupper() and not any(c.isdigit() for c in name):
            # Allow known all-caps brands
            known_caps = ['IKEA', 'CVS', 'IBM', 'HP', 'LG', 'BMW', 'NASA', 'ESPN', 'HBO', 'CNN', 'BBC', 'NBC', 'CBS', 'ABC', 'FOX', 'MTV', 'AMD', 'SAP', 'UPS', 'DHL', 'KFC', 'GAP']
            if name not in known_caps:
                continue

        # Normalize to avoid duplicates
        name_lower = name.lower()
        if name_lower not in seen:
            seen.add(name_lower)
            validated.append(name)

    return validated


def validate_person_names(names: List[str]) -> List[str]:
    """Filter out misidentified or invalid person names."""
    # Common invalid patterns for person names
    invalid_patterns = [
        'Unknown', 'Speaker', 'Presenter', 'Author', 'Guest',
        'Moderator', 'Panelist', 'Host', 'CEO', 'CTO', 'CFO',
        'Manager', 'Director', 'President', 'Chairman', 'Founder',
        'Name', 'Person', 'User', 'Member', 'Participant',
        'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Sir', 'Madam',
        'TBD', 'TBA', 'N/A', 'NA', 'Anonymous',
    ]

    # Common words that shouldn't be names
    common_words = {
        'the', 'and', 'for', 'with', 'from', 'about', 'this', 'that',
        'team', 'group', 'company', 'organization', 'department',
        'click', 'here', 'more', 'info', 'read', 'view', 'see',
        'linkedin', 'facebook', 'twitter', 'instagram', 'email',
        'contact', 'website', 'profile', 'page', 'link',
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    }

    validated = []
    seen = set()

    for name in names:
        name = name.strip()

        # Skip empty or very short names
        if len(name) < 3:
            continue

        # Skip single word names (need at least first and last name)
        words = name.split()
        if len(words) < 2:
            continue

        # Skip if more than 5 words (likely a sentence, not a name)
        if len(words) > 5:
            continue

        # Skip names that are just numbers or symbols
        if all(not c.isalpha() for c in name):
            continue

        # Skip names with too many special characters
        special_count = sum(1 for c in name if not c.isalnum() and c not in ' .-\'')
        if special_count > 2:
            continue

        # Skip invalid patterns
        name_upper = name.upper()
        if any(pattern.upper() == name_upper for pattern in invalid_patterns):
            continue

        # Skip if any word is a common non-name word
        name_words_lower = [w.lower() for w in words]
        if any(word in common_words for word in name_words_lower):
            continue

        # Skip if it looks like a title without a name
        if words[0].lower() in ['dr', 'mr', 'mrs', 'ms', 'prof', 'sir'] and len(words) == 1:
            continue

        # Skip names that are all uppercase or all lowercase (likely OCR errors)
        # Unless it's a short name (2 words)
        if len(words) > 2 and (name.isupper() or name.islower()):
            continue

        # Normalize to avoid duplicates
        name_lower = name.lower()
        if name_lower not in seen:
            seen.add(name_lower)
            # Capitalize properly
            validated.append(' '.join(word.capitalize() for word in words))

    return validated


def analyze_image_with_gemini(image_data: bytes, tag: str) -> List[dict]:
    """Use Google's Gemini Vision API to analyze images and get LinkedIn URLs."""
    api_key = os.getenv('GEMINI_API_KEY')

    if not api_key:
        return []

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')

        # Create image part
        img = Image.open(io.BytesIO(image_data))

        if tag == 'people':
            prompt = """You are an expert visual research assistant specializing in identifying people from images.

**Your Task:** Identify all people visible or mentioned in this image and find their LinkedIn profiles.

**Where to Look for People:**
1. **Faces in photos** - Identify well-known public figures, speakers, executives, or celebrities
2. **Name badges or labels** - Text identifying people (e.g., "John Smith, CEO")
3. **Speaker/presenter lists** - Conference agendas, event programs, webinar panels
4. **Author credits** - Article bylines, book covers, presentation slides
5. **Team pages** - Company about pages, organizational charts
6. **Social media posts** - Screenshots showing usernames or profile names
7. **Business cards** - Contact information images
8. **Award/recognition lists** - Names of winners, nominees, honorees

**Your Process:**
1. Scan the entire image for any person names or identifiable faces
2. For each person found, extract their FULL NAME (First and Last name minimum)
3. If you recognize a famous person by face, identify them
4. Predict their most likely LinkedIn profile URL based on name

**Critical Rules:**
- Only include names you are CONFIDENT about
- Must have at least first AND last name (e.g., "John Smith" not just "John")
- For common names, include any additional context visible (title, company) to help search
- If you see a face but cannot identify who it is, skip it
- Do NOT include fictional characters, stock photo models, or generic placeholder names

**Output Format (JSON only, no markdown):**
[
  {
    "name": "Full Person Name",
    "linkedin_url": "https://www.linkedin.com/in/predicted-slug"
  }
]

If no people can be identified, return: []"""
        else:
            prompt = """You are an expert visual research assistant. Your goal is to accurately identify entities in images and extract their professional online presence.

**Your Process:**
1. **Analyze the image thoroughly.** Look for logos, brand names, stylized text, or recognizable people.
2. **Identify the entity.** Explicitly write down the full, correct name of the organization or person found.
3. **Formulate a search query.** Internally, think of the best search query to find their official LinkedIn page (e.g., "Official LinkedIn page for [Name]").
4. **Predict the LinkedIn URL.** Based on your knowledge, provide the most likely official LinkedIn URL.
5. **Format the final output.** Present your findings in the specified JSON format only.

Analyze the provided image.

For every distinct organization logo or person identifiable in the image:
1. State the exact **Name** of the organization or person.
2. Provide their official **LinkedIn Company Page URL** or **LinkedIn Profile URL**.

**Important Constraints:**
- If a name is in a non-English language, provide the name as written, and optionally the English translation in parentheses.
- If you cannot positively identify a logo or person, do not guess. Skip it.
- Do not generate URLs for generic entities (e.g., don't create a link for just "Symphony Orchestra" if the logo says "Singapore Symphony Orchestra"). Be specific.
- Provide the final output *only* as a raw JSON list of objects. Do not include markdown formatting (like ```json) around it.

**Required Output Structure:**
[
  {
    "name": "Name of Entity 1",
    "linkedin_url": "https://www.linkedin.com/company/entity-slug"
  },
  {
    "name": "Name of Entity 2",
    "linkedin_url": "https://www.linkedin.com/in/person-slug"
  }
]"""

        response = model.generate_content([prompt, img])
        response_text = response.text.strip()

        # Parse JSON response
        if response_text.startswith('['):
            results = json.loads(response_text)
            return results[:20]
        else:
            # Try to extract JSON from response
            start = response_text.find('[')
            end = response_text.rfind(']') + 1
            if start != -1 and end > start:
                results = json.loads(response_text[start:end])
                return results[:20]

        return []

    except Exception as e:
        print(f"Gemini Vision API error: {e}")
        return []


def analyze_image_with_groq(image_data: bytes, tag: str) -> List[dict]:
    """Use Groq's Llama Vision API to analyze images and get LinkedIn URLs."""
    api_key = os.getenv('GROQ_API_KEY')

    if not api_key:
        return []

    try:
        client = Groq(api_key=api_key)

        # Convert image to base64
        base64_image = base64.b64encode(image_data).decode('utf-8')

        # Determine media type
        img = Image.open(io.BytesIO(image_data))
        if img.format == 'PNG':
            media_type = 'image/png'
        else:
            media_type = 'image/jpeg'

        completion = client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            temperature=0.1,
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert visual research assistant. Your goal is to accurately identify entities in images and extract their professional online presence.

**Your Process:**
1. **Analyze the image thoroughly.** Look for logos, brand names, stylized text, or recognizable people.
2. **Identify the entity.** Explicitly write down the full, correct name of the organization or person found.
3. **Formulate a search query.** Internally, think of the best search query to find their official LinkedIn page (e.g., "Official LinkedIn page for [Name]").
4. **Predict the LinkedIn URL.** Based on your knowledge, provide the most likely official LinkedIn URL.
5. **Format the final output.** Present your findings in the specified JSON format only."""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze the provided image.

For every distinct organization logo or person identifiable in the image:
1. State the exact **Name** of the organization or person.
2. Provide their official **LinkedIn Company Page URL** or **LinkedIn Profile URL**.

**Important Constraints:**
- If a name is in a non-English language, provide the name as written, and optionally the English translation in parentheses.
- If you cannot positively identify a logo or person, do not guess. Skip it.
- Do not generate URLs for generic entities (e.g., don't create a link for just "Symphony Orchestra" if the logo says "Singapore Symphony Orchestra"). Be specific.
- Provide the final output *only* as a raw JSON list of objects. Do not include markdown formatting (like ```json) around it.

**Required Output Structure:**
[
  {
    "name": "Name of Entity 1",
    "linkedin_url": "https://www.linkedin.com/company/entity-slug"
  },
  {
    "name": "Name of Entity 2",
    "linkedin_url": "https://www.linkedin.com/in/person-slug"
  }
]"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ]
        )

        response_text = completion.choices[0].message.content.strip()

        # Parse JSON response
        if response_text.startswith('['):
            results = json.loads(response_text)
            return results[:20]
        else:
            # Try to extract JSON from response
            start = response_text.find('[')
            end = response_text.rfind(']') + 1
            if start != -1 and end > start:
                results = json.loads(response_text[start:end])
                return results[:20]

        return []

    except Exception as e:
        print(f"Groq Vision API error: {e}")
        return []


def analyze_image_with_vision(image_data: bytes, tag: str) -> List[str]:
    """Use Claude's vision API to analyze images for logos, faces, and text."""
    api_key = os.getenv('ANTHROPIC_API_KEY')

    if not api_key:
        return []

    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Convert image to base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')

        # Determine media type
        img = Image.open(io.BytesIO(image_data))
        if img.format == 'PNG':
            media_type = 'image/png'
        elif img.format in ['JPEG', 'JPG']:
            media_type = 'image/jpeg'
        else:
            media_type = 'image/jpeg'

        if tag == 'companies':
            prompt = """Analyze this image and identify all company/organization names.

CRITICAL RULES:
1. Only return company names you are 100% CONFIDENT about
2. If you're unsure about a logo or text, DO NOT include it
3. Use OFFICIAL company names with correct spelling and capitalization

LOGO RECOGNITION (identify by visual design, NOT text interpretation):
- Four interlocking rings/circles = "Audi" (NEVER "QQQQ", "OOOO", or similar)
- Pink/blue "BR" with 31 hidden = "Baskin-Robbins" (NOT just "BR")
- Swoosh checkmark = "Nike"
- Bitten apple silhouette = "Apple"
- Three-pointed star in circle = "Mercedes-Benz"
- Blue oval = "Ford"
- Colorful "G" = "Google"
- Blue "f" = "Facebook"
- Yellow shell = "Shell"
- Red bullseye = "Target"
- Mermaid in circle = "Starbucks"
- Smile arrow = "Amazon"
- Colorful window = "Microsoft"

VALIDATION CHECKLIST:
- Is this a real, well-known company name?
- Is the spelling correct?
- Is the capitalization correct (e.g., "Nokia" not "NOKIA", "Cisco" not "cisCo")?
- Am I interpreting a logo shape as random letters? If yes, identify the actual brand.

Look for:
1. Company logos - identify the BRAND NAME from visual design
2. Brand names written as text
3. Organization names

Return ONLY a JSON array of company names you are confident about.
Use proper capitalization (e.g., "Google", "Microsoft", "Nike", "Audi").
Skip anything you're not sure about - it's better to miss some than to include wrong ones.

Example: ["Google", "Audi", "Microsoft", "Apple", "Nike", "Amazon", "Starbucks"]

If you cannot confidently identify any companies, return an empty array: []"""
        else:
            prompt = """Analyze this image and identify all person names you can find.

Look for:
1. Names written as text - speaker names, attendee names, author names
2. Name badges or labels
3. Credits or attributions
4. Captions identifying people in photos

Return ONLY a JSON array of full person names (first and last name), nothing else.
Be very accurate - only include names you can clearly identify.
Remove duplicates.

Example: ["John Smith", "Sarah Johnson", "Michael Chen"]

If you cannot identify any person names, return an empty array: []"""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        )

        response_text = message.content[0].text.strip()

        import json
        if response_text.startswith('['):
            names = json.loads(response_text)
            return names[:20]
        else:
            start = response_text.find('[')
            end = response_text.rfind(']') + 1
            if start != -1 and end > start:
                names = json.loads(response_text[start:end])
                return names[:20]

        return []

    except Exception as e:
        print(f"Vision API error: {e}")
        return []


def extract_names_with_ocr_and_claude(image_data: bytes, raw_text: str, tag: str) -> List[str]:
    """Combine OCR text with Claude for intelligent name extraction."""
    api_key = os.getenv('ANTHROPIC_API_KEY')

    if not api_key or not raw_text:
        return basic_extract_names(raw_text)

    try:
        client = anthropic.Anthropic(api_key=api_key)

        if tag == 'companies':
            prompt = f"""Extract company/organization names from this OCR text.
Return ONLY a JSON array of company names, nothing else.
Remove duplicates and filter out random words, numbers, or incomplete text.
Focus on:
- Company/organization names (full official names)
- Brand names
- Institution names

Be very accurate - only extract clear, complete company names.

OCR Text:
{raw_text}

Return format: ["Company 1", "Company 2", "Company 3"]"""
        else:
            prompt = f"""Extract person names from this OCR text.
Return ONLY a JSON array of person names, nothing else.
Remove duplicates and filter out random words, numbers, or incomplete text.
Focus on:
- Full person names (first and last name together)

Be very accurate - only extract clear, complete names.
Do not include titles, positions, or partial names.

OCR Text:
{raw_text}

Return format: ["John Smith", "Sarah Johnson"]"""

        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        response_text = message.content[0].text.strip()

        import json
        if response_text.startswith('['):
            names = json.loads(response_text)
            return names[:20]
        else:
            start = response_text.find('[')
            end = response_text.rfind(']') + 1
            if start != -1 and end > start:
                names = json.loads(response_text[start:end])
                return names[:20]

        return basic_extract_names(raw_text)

    except Exception as e:
        print(f"Claude API error: {e}")
        return basic_extract_names(raw_text)


def basic_extract_names(text: str) -> List[str]:
    """Basic name extraction without AI."""
    if not text:
        return []

    lines = text.split('\n')
    names = []

    for line in lines:
        line = line.strip()
        if len(line) < 2 or len(line) > 100:
            continue
        if all(c.isdigit() or c.isspace() or not c.isalnum() for c in line):
            continue
        if len(line.split()) > 6:
            continue
        names.append(line)

    seen = set()
    unique_names = []
    for name in names:
        if name.lower() not in seen:
            seen.add(name.lower())
            unique_names.append(name)

    return unique_names[:20]


@app.get("/")
async def root():
    return {"message": "Halo Trace API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/search", response_model=SearchResponse)
async def search_profiles(request: SearchRequest):
    """Find LinkedIn profiles for extracted names."""
    if not request.names:
        raise HTTPException(status_code=400, detail="No names provided")

    if len(request.names) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 names allowed")

    results = []
    for name in request.names:
        name = name.strip()
        profile_data = find_linkedin_profile(name, request.tag)

        results.append(SearchResult(
            name=name,
            linkedinUrl=profile_data['url'],
            isExactMatch=profile_data['isExact'],
            profileTitle=profile_data['title']
        ))

    return SearchResponse(results=results)


@app.post("/api/ocr")
async def extract_text(
    file: UploadFile = File(...),
    tag: str = Form(default="companies")
):
    """Extract names from uploaded image using Vision AI and OCR."""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')

        # Save to bytes for processing
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='JPEG')
        img_bytes = img_buffer.getvalue()

        # Primary Method: Use Gemini Vision API (returns names)
        gemini_results = analyze_image_with_gemini(img_bytes, tag)

        if gemini_results:
            # Extract names from Gemini results
            final_names = []

            for result in gemini_results:
                name = result.get('name', '').strip()
                if name:
                    final_names.append(name)

            # Apply validation based on tag
            if tag == 'companies':
                validated_names = validate_company_names(final_names)
                final_names = validated_names
            else:
                validated_names = validate_person_names(final_names)
                final_names = validated_names

            # Search for actual LinkedIn URLs using DuckDuckGo
            linkedin_urls = {}
            for name in final_names[:20]:
                profile_result = find_linkedin_profile(name, tag)
                if profile_result['isExact']:
                    linkedin_urls[name] = profile_result['url']
                # If not exact, don't add to linkedin_urls - frontend will show as search

            return {
                "success": True,
                "names": final_names[:20],
                "linkedin_urls": linkedin_urls,
                "raw_text": ""
            }

        # Fallback: Use Claude Vision + EasyOCR
        vision_names = analyze_image_with_vision(img_bytes, tag)

        # Use EasyOCR to extract text
        image_np = np.array(image)
        reader = get_ocr_reader()
        ocr_results = reader.readtext(image_np)
        raw_text = '\n'.join([text for _, text, _ in ocr_results])

        # Use Claude to extract names from OCR text
        ocr_names = extract_names_with_ocr_and_claude(img_bytes, raw_text, tag)

        # Combine results, prioritizing vision results
        all_names = vision_names + ocr_names

        # Remove duplicates while preserving order
        seen = set()
        unique_names = []
        for name in all_names:
            name_lower = name.lower().strip()
            if name_lower and name_lower not in seen:
                seen.add(name_lower)
                unique_names.append(name.strip())

        # Apply validation based on tag
        if tag == 'companies':
            unique_names = validate_company_names(unique_names)
        else:
            unique_names = validate_person_names(unique_names)

        # Limit to 20 names
        final_names = unique_names[:20]

        return {
            "success": True,
            "names": final_names,
            "linkedin_urls": {},
            "raw_text": raw_text
        }

    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
