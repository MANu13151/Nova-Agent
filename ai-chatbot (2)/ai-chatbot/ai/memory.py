class ConversationMemory:
    """
    Manages in-memory chat logs and user metadata for each active user session.
    """
    def __init__(self, max_turns: int = 10):
        self.sessions = {}
        self.user_names = {}
        self.max_turns = max_turns  # Keep the last N exchanges (user + assistant)

    def get_history(self, session_id: str) -> list:
        """Returns the conversation history for a given session."""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        return self.sessions[session_id]

    def add_message(self, session_id: str, role: str, content: str):
        """Adds a message to the history for a given session, pruning if too long."""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
            
        self.sessions[session_id].append({
            "role": role, 
            "content": content
        })
        
        # Keep at most max_turns * 2 messages (e.g. 10 turns = 20 messages)
        max_messages = self.max_turns * 2
        if len(self.sessions[session_id]) > max_messages:
            self.sessions[session_id] = self.sessions[session_id][-max_messages:]

    def clear_history(self, session_id: str):
        """Resets the history and metadata for a session."""
        self.sessions[session_id] = []
        if session_id in self.user_names:
            del self.user_names[session_id]

    def set_user_name(self, session_id: str, user_name: str):
        """Associates a user's name with a session."""
        self.user_names[session_id] = user_name

    def get_user_name(self, session_id: str, default: str = "Guest") -> str:
        """Retrieves the user's name for a session."""
        return self.user_names.get(session_id, default)

# Singleton instance for memory management
memory_manager = ConversationMemory(max_turns=10)
