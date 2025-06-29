import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import requests
import json
import logging

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

# --- API CONFIGURATION ---
app = FastAPI()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
SEARCH_ENGINE_ID = os.getenv("SEARCH_ENGINE_ID")
SEARCH_URL = "https://www.googleapis.com/customsearch/v1"

# --- DATA MODELS ---
class Claim(BaseModel):
    text: str

class Transcript(BaseModel):
    text: str

# --- PROMPTS ---
socratic_prompt = (
    """
You are a Socratic moderator and a master of lateral thinking...
USER'S CLAIM: "{claim_text}"
YOUR UNIQUE QUESTION:
"""
)
researcher_prompt = (
    """
Convert the user's claim into 3 Google search queries in a JSON array...
USER'S CLAIM: "{claim_text}"
"""
)
analyst_prompt = (
    """
Select top 2 sources and return JSON evidence array with summary and url.
SEARCH RESULTS:
{search_results}
"""
)
summarizer_prompt = (
    """
You are a concise summarizer. Summarize the debate transcript below in one paragraph:

DEBATE TRANSCRIPT:
"""
)

# Initialize model
model = genai.GenerativeModel('gemini-2.5-flash')

def perform_google_search(query: str):
    params = {'key': SEARCH_API_KEY, 'cx': SEARCH_ENGINE_ID, 'q': query}
    response = requests.get(SEARCH_URL, params=params)
    response.raise_for_status()
    return response.json()

def clean_and_parse_json(raw_text: str):
    start = raw_text.find('[') if '[' in raw_text else raw_text.find('{')
    end = raw_text.rfind(']') if ']' in raw_text else raw_text.rfind('}')
    if start != -1 and end != -1:
        try:
            return json.loads(raw_text[start:end+1])
        except json.JSONDecodeError as jde:
            logging.error(f"JSON parse error: {jde}\nRaw: {raw_text}")
            raise
    raise ValueError(f"No valid JSON found in response: {raw_text}")


# --- THIS IS THE NEW ENDPOINT ---
@app.get("/")
async def get_status():
    """Provides a simple status message to confirm the service is online."""
    return {"status": "Project Athena AI Service is online and operational"}


# --- ENDPOINTS ---
@app.post("/generate-question")
async def generate_question(claim: Claim):
    try:
        prompt = socratic_prompt.format(claim_text=claim.text)
        resp = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=0.9)
        )
        return {"question": resp.text}
    except Exception as e:
        logging.error(f"Error in generate-question: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/find-evidence")
async def find_evidence(claim: Claim):
    try:
        prompt = researcher_prompt.format(claim_text=claim.text)
        resp = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=0.7)
        )
        queries = clean_and_parse_json(resp.text)
        all_items = []
        for q in queries:
            try:
                items = perform_google_search(q).get('items', [])
                all_items.extend(items)
            except Exception as e:
                logging.error(f"Search API error for query '{q}': {e}")
        # Return empty evidence on no items
        if not all_items:
            return {"evidence": []}
        # Format results for analyst
        formatted = '\n'.join(
            f"Title: {i.get('title')}, Snippet: {i.get('snippet')}" for i in all_items
        )
        resp2 = model.generate_content(
            analyst_prompt.format(search_results=formatted),
            generation_config=genai.types.GenerationConfig(temperature=0.5)
        )
        evidence = clean_and_parse_json(resp2.text)
        return {"evidence": evidence}
    except Exception as e:
        logging.error(f"Error in find-evidence: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize(transcript: Transcript):
    try:
        prompt = summarizer_prompt + transcript.text
        resp = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=0.3)
        )
        return {"summary": resp.text.strip()}
    except Exception as e:
        logging.error(f"Error in summarize: {e}")
        raise HTTPException(status_code=500, detail=str(e))
