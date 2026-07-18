document.getElementById("micButton").addEventListener("click", function () {

    let chatBox = document.getElementById("chat-box");

    chatBox.innerHTML += `
        <div class="bot-message" id="status">
            🎤 Listening...
        </div>
    `;

    chatBox.scrollTop = chatBox.scrollHeight;

    fetch("/listen")
        .then(response => response.json())
        .then(data => {

            document.getElementById("status").innerHTML = "🤔 Thinking...";

            setTimeout(function(){

                document.getElementById("status").remove();

                chatBox.innerHTML += `
                    <div class="user-message">
                        👤 ${data.speech}
                    </div>
                `;

                chatBox.innerHTML += `
                    <div class="bot-message">
                        🤖 ${data.response}
                    </div>
                `;

                chatBox.scrollTop = chatBox.scrollHeight;

            },1000);

        })

        .catch(error=>{

            document.getElementById("status").remove();

            chatBox.innerHTML += `
                <div class="bot-message">
                    ❌ Error occurred.
                </div>
            `;
        });

});