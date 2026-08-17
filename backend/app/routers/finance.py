from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.wallets import WalletOut, TransactionOut, DepositRequest, WithdrawRequest
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from app.models.users import User
from app.services import finance as finance_service

router = APIRouter()


@router.get('/wallet')
def get_wallet(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wallet = finance_service.get_wallet_by_user_id(db, current_user.id)
    if not wallet:
        wallet = finance_service.create_wallet(db, current_user.id)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy wallet thành công',
        data=WalletOut.model_validate(wallet).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/wallet/deposit')
def deposit(
    request: Request,
    payload: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wallet = finance_service.get_wallet_by_user_id(db, current_user.id)
    if not wallet:
        wallet = finance_service.create_wallet(db, current_user.id)

    try:
        transaction = finance_service.deposit(db, wallet.id, payload.amount)
        return BaseResponse.create(
            status_code=status.HTTP_200_OK,
            message='Nạp tiền thành công',
            data=TransactionOut.model_validate(transaction).model_dump(),
            error=None,
            path=request.url.path
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post('/wallet/withdraw')
def withdraw(
    request: Request,
    payload: WithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wallet = finance_service.get_wallet_by_user_id(db, current_user.id)
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Wallet không tìm thấy')

    try:
        transaction = finance_service.withdraw(db, wallet.id, payload.amount)
        return BaseResponse.create(
            status_code=status.HTTP_200_OK,
            message='Rút tiền thành công',
            data=TransactionOut.model_validate(transaction).model_dump(),
            error=None,
            path=request.url.path
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get('/wallet/transactions')
def get_transactions(
    request: Request,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wallet = finance_service.get_wallet_by_user_id(db, current_user.id)
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Wallet không tìm thấy')

    transactions = finance_service.get_transactions(db, wallet.id, limit)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy lịch sử giao dịch thành công',
        data=[TransactionOut.model_validate(t).model_dump() for t in transactions],
        error=None,
        path=request.url.path
    )
