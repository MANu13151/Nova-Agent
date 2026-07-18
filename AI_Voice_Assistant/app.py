import google.generativeai as genai
import webbrowser
import datetime
import pyttsx3
from flask import Flask, render_template, jsonify
import speech_recognition as sr

import os

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")
genai.configure(api_key=api_key)

model = genai.GenerativeModel("gemini-2.5-flash")

app = Flask(__name__)

def ask_gemini(question):
    try:
        response = model.generate_content(
            question + ". Answer in 2 or 3 short sentences only."
        )
        return response.text
    except Exception:
        return "Sorry, I couldn't get a response from Gemini."
def get_response(text):
    text = text.lower()

    if "hello" in text:
        return "Hello! How can I help you today?"

    elif "how are you" in text:
        return "I am doing great. Thank you."

    elif "your name" in text:
        return "I am your AI Voice Assistant."

    elif "time" in text:
        current_time = datetime.datetime.now().strftime("%I:%M %p")
        return "The current time is " + current_time

    elif "open google" in text:
        return "Opening Google."

    elif "open youtube" in text or "open you tube" in text:
        return "Opening YouTube."

    elif "bye" in text:
        return "Goodbye! Have a nice day."

    else:
        return ask_gemini(text)
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/listen')
def listen():
    recognizer = sr.Recognizer()

    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source)
        audio = recognizer.listen(source)

    try:
        text = recognizer.recognize_google(audio)
        if "open google" in text.lower():
         webbrowser.open("https://www.google.com")

        elif "open youtube" in text.lower():
         webbrowser.open("https://www.youtube.com")


        response = get_response(text)

        engine = pyttsx3.init()
        engine.say(response)
        engine.runAndWait()

        return jsonify({
            "speech": text,
            "response": response
        })

    except sr.UnknownValueError:
     return jsonify({
        "speech": "",
        "response": "Sorry, I couldn't understand your voice."
    })

    except sr.RequestError:
     return jsonify({
        "speech": "",
        "response": "Internet connection error."
    })

if __name__ == "__main__":
    app.run(debug=True)