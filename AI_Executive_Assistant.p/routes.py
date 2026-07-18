from fastapi import APIRouter

router = APIRouter()

@router.get("/dashboard")
def dashboard():
    return {
        "status": "success",
        "message": "Dashboard Loaded Successfully"
    }

@router.get("/employees")
def employees():
    return {
        "employees": [
            {"id": 1, "name": "John", "department": "HR"},
            {"id": 2, "name": "Alice", "department": "IT"},
            {"id": 3, "name": "David", "department": "Finance"}
        ]
    }
