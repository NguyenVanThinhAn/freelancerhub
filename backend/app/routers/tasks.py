from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.tasks import Task
from app.models.contracts import Contract
from app.models.organizations import Organization
from app.schemas.tasks import TaskCreate, TaskUpdate, TaskOut
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def _user_role(current_user) -> str:
    return current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)


def check_contract_access(db: Session, contract_id: str, current_user):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    role = _user_role(current_user)
    user_id = current_user.id

    if role == "freelancer" and contract.freelancer_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif role == "enterprise":
        org = db.query(Organization).filter(
            Organization.owner_user_id == current_user.id,
            Organization.id == contract.organization_id
        ).first()
        if not org:
            raise HTTPException(status_code=403, detail="Not authorized")

    return contract

@router.post("")
def create_task(
    request: Request,
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    check_contract_access(db, task_in.contract_id, current_user)
    
    new_task = Task(**task_in.model_dump())
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Tạo công việc thành công',
        data=TaskOut.model_validate(new_task).model_dump(),
        error=None,
        path=request.url.path
    )

@router.get("")
def get_tasks(
    request: Request,
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    check_contract_access(db, contract_id, current_user)
    
    tasks = db.query(Task).filter(Task.contract_id == contract_id).order_by(Task.created_at.asc()).all()
    
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách công việc thành công',
        data=[TaskOut.model_validate(t).model_dump() for t in tasks],
        error=None,
        path=request.url.path
    )

@router.patch("/{task_id}")
def update_task(
    request: Request,
    task_id: str,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    check_contract_access(db, task.contract_id, current_user)
    
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
        
    db.commit()
    db.refresh(task)
    
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Cập nhật công việc thành công',
        data=TaskOut.model_validate(task).model_dump(),
        error=None,
        path=request.url.path
    )

@router.delete("/{task_id}")
def delete_task(
    request: Request,
    task_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    check_contract_access(db, task.contract_id, current_user)
    
    db.delete(task)
    db.commit()
    
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Xóa công việc thành công',
        data=None,
        error=None,
        path=request.url.path
    )
