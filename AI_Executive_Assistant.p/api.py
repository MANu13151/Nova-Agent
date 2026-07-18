from fastapi import APIRouter

api_router = APIRouter()

@api_router.get("/report")
def generate_report():
    return {
        "report_name": "Monthly Executive Report",
        "status": "Generated Successfully",
        "total_employees": 3
    }

@api_router.get("/query")
def ai_query():
    return {
        "question": "Show employee summary",
        "answer": "There are 3 employees in the organization."
    }