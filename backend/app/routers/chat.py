from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.chat import ChatMessage
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse

router = APIRouter(prefix="/api/chat", tags=["Employee Chat"])


@router.post("/messages", response_model=ChatMessageResponse, status_code=201)
def send_message(
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    receiver = db.query(User).filter(
        User.id == payload.receiver_id,
        User.is_active.is_(True),
    ).first()

    if not receiver:
        raise HTTPException(status_code=404, detail="Recipient not found.")

    if receiver.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot send a message to yourself.",
        )

    message = ChatMessage(
        sender_id=current_user.id,
        receiver_id=receiver.id,
        message=payload.message.strip(),
    )

    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/messages", response_model=list[ChatMessageResponse])
def list_messages(
    conversation_with: int | None = Query(default=None, gt=0),
    unread_only: bool = False,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ChatMessage).filter(
        or_(
            ChatMessage.sender_id == current_user.id,
            ChatMessage.receiver_id == current_user.id,
        )
    )

    if conversation_with is not None:
        query = query.filter(
            or_(
                (
                    (ChatMessage.sender_id == current_user.id)
                    & (ChatMessage.receiver_id == conversation_with)
                ),
                (
                    (ChatMessage.sender_id == conversation_with)
                    & (ChatMessage.receiver_id == current_user.id)
                ),
            )
        )

    if unread_only:
        query = query.filter(
            ChatMessage.receiver_id == current_user.id,
            ChatMessage.is_read.is_(False),
        )

    return (
        query.order_by(ChatMessage.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/unread-count")
def unread_message_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(ChatMessage).filter(
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.is_read.is_(False),
    ).count()

    return {"unread_count": count}


@router.patch("/messages/{message_id}/read", response_model=ChatMessageResponse)
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = db.query(ChatMessage).filter(
        ChatMessage.id == message_id,
        ChatMessage.receiver_id == current_user.id,
    ).first()

    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found.",
        )

    message.is_read = True
    message.read_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(message)
    return message


@router.patch(
    "/conversations/{other_user_id}/read",
)
def mark_conversation_read(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if other_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Invalid conversation.")

    messages = db.query(ChatMessage).filter(
        ChatMessage.sender_id == other_user_id,
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.is_read.is_(False),
    ).all()

    now = datetime.now(timezone.utc)

    for message in messages:
        message.is_read = True
        message.read_at = now

    db.commit()

    return {
        "message": "Conversation marked as read.",
        "updated_count": len(messages),
    }


@router.delete("/messages/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = db.query(ChatMessage).filter(
        ChatMessage.id == message_id,
        ChatMessage.sender_id == current_user.id,
    ).first()

    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found or you are not the sender.",
        )

    db.delete(message)
    db.commit()

    return {"message": "Message deleted successfully."}
