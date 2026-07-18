import speech_recognition as sr

# Create a recognizer object
recognizer = sr.Recognizer()

# Access the microphone
with sr.Microphone() as source:
    print("Listening...")

    # Reduce background noise
    recognizer.adjust_for_ambient_noise(source)

    # Listen to the user's voice
    audio = recognizer.listen(source)

try:
    print("Recognizing...")

    # Convert speech to text
    text = recognizer.recognize_google(audio)

    print("You said:", text)

except sr.UnknownValueError:
    print("Sorry, I couldn't understand your voice.")

except sr.RequestError:
    print("Unable to connect to the speech recognition service.")