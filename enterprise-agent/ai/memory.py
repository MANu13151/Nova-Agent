class ConversationMemory:
    """
    Manages in-memory chat logs for each active user session.
    """
    def __init__(self, max_turns: int = 10):
        self.sessions = {}
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
        
        # Each exchange is 2 messages (user + assistant).
        # We prune list to keep at most max_turns * 2 elements.
        max_messages = self.max_turns * 2
        if len(self.sessions[session_id]) > max_messages:
            self.sessions[session_id] = self.sessions[session_id][-max_messages:]

    def clear_history(self, session_id: str):
        """Resets the history for a session."""
        self.sessions[session_id] = []

# Singleton instance for memory management
memory_manager = ConversationMemory(max_turns=10)
