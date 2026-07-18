const transcriptOutput = document.querySelector("#transcriptOutput");
const connectionStatus = document.querySelector("#connectionStatus");
const micStatus = document.querySelector("#micStatus");
const uploadStatus = document.querySelector("#uploadStatus");
const pushStatus = document.querySelector("#pushStatus");
const clearTranscript = document.querySelector("#clearTranscript");
const startMic = document.querySelector("#startMic");
const stopMic = document.querySelector("#stopMic");
const uploadForm = document.querySelector("#uploadForm");
const audioFile = document.querySelector("#audioFile");
const pushForm = document.querySelector("#pushForm");
const pushText = document.querySelector("#pushText");

const httpBase = window.location.origin;
const wsBase = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

let transcriptSocket;


connectTranscriptSocket();

clearTranscript.addEventListener("click", () => {
  transcriptOutput.textContent = "Waiting for speech...";
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = audioFile.files[0];
  if (!file) {
    setPill(uploadStatus, "Choose file", "error");
    return;
  }

  setPill(uploadStatus, "Transcribing", "active");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${httpBase}/transcribe`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setTranscript(data.text || "");
    setPill(uploadStatus, "Done", "");
  } catch (error) {
    setPill(uploadStatus, "Failed", "error");
  }
});

pushForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = pushText.value.trim();
  if (!text) {
    setPill(pushStatus, "Empty", "error");
    return;
  }

  setPill(pushStatus, "Sending", "active");

  try {
    await fetch(`${httpBase}/transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    pushText.value = "";
    setPill(pushStatus, "Sent", "");
  } catch (error) {
    setPill(pushStatus, "Failed", "error");
  }
});

function connectTranscriptSocket() {
  transcriptSocket = new WebSocket(`${wsBase}/ws`);

  transcriptSocket.addEventListener("open", () => {
    connectionStatus.textContent = "Connected";
    connectionStatus.className = "status connected";
  });

  transcriptSocket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.transcript) {
        setTranscript(data.transcript);
      }
    } catch (error) {
      setTranscript(event.data);
    }
  });

  transcriptSocket.addEventListener("close", () => {
    connectionStatus.textContent = "Reconnecting";
    connectionStatus.className = "status";
    setTimeout(connectTranscriptSocket, 1200);
  });

  transcriptSocket.addEventListener("error", () => {
    connectionStatus.textContent = "Connection error";
    connectionStatus.className = "status error";
  });
}



function setTranscript(text) {
  transcriptOutput.textContent = text || "No speech detected.";
}

function setPill(element, text, state) {
  element.textContent = text;
  element.className = `pill${state ? ` ${state}` : ""}`;
}


