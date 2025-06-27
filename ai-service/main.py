# Location: ai-service/main.py
import os
import google.generativeai as genai
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# --- 1. CONFIGURE THE API ---
# Set up the FastAPI app
app = FastAPI()

# Configure the Google AI client with your API key
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# --- 2. DEFINE THE DATA MODEL ---
# This tells FastAPI what the incoming request data should look like
class Claim(BaseModel):
    text: str

# --- 3. CREATE THE AI LOGIC ---
# This is where we define the AI's "personality" and task
socratic_prompt = """
You are a Socratic moderator and a master of lateral thinking, currently working on a visual debate platform.
Your primary goal is to generate a single, non-obvious, and deeply insightful question based on the user's claim below.

**CRITICAL INSTRUCTIONS:**
1.  **DO NOT** repeat questions or provide generic, common-knowledge inquiries. Every question must be novel.
2.  Your question must challenge the underlying assumptions of the user's claim.
3.  The question should be concise and formatted as a single sentence.
4.  Do not answer or comment on the claim. Only ask the question.

USER'S CLAIM: "{claim_text}"
YOUR UNIQUE INSIGHTFUL QUESTION:
"""

# Initialize the Generative Model
model = genai.GenerativeModel('gemini-2.0-flash')

# --- 4. CREATE THE API ENDPOINT ---
# In ai-service/main.py

@app.post("/generate-question")
async def generate_question(claim: Claim):
    try:
        prompt_with_claim = socratic_prompt.format(claim_text=claim.text)
        generation_config = genai.types.GenerationConfig(temperature=0.9)
        response = model.generate_content(
            prompt_with_claim,
            generation_config=generation_config
        )
        return {"question": response.text}
    except Exception as e:
        # Check if the error is a rate limit error
        if "429" in str(e) and "quota" in str(e).lower():
            print("RATE LIMIT EXCEEDED.")
            return {"error": "RATE_LIMIT"}
        
        print(f"An unexpected error occurred: {e}")
        return {"error": "Failed to generate question from AI model."}