##########################
#       Created By       #
#          SBR           #
##########################
import uvicorn
import sys
from modules.Logger import Logger
from modules.Config import Config
from modules.DB.connectors.mysql import MySql
from modules.DB.connectors.sqlite import Sqlite3
from modules.DB.CRUD import CRUD
from wg_providers.VpnJantit import VpnJantit

from datetime import datetime, timedelta, timezone
from typing import Annotated
import jwt
from fastapi import Depends, FastAPI, HTTPException, status, Query, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from pydantic import BaseModel, Field
##########################
config_path = 'config.json'
version = 'debug'
##########################


def setup_db() -> CRUD:
    match config.get_config_data("DB"):
        case "mysql":
            db_connector = MySql(config, logger)
        case "sqlite3":
            db_connector = Sqlite3(config, logger)
        case _:
            logger.error("DB source unfilled or incorrect!")
            sys.exit()
    return CRUD(db_connector)
    # jantit = VpnJantit(db_connector, config, logger, "", "", "", version)
    # jantit.get_config()


def main():
    class RegisterUser(BaseModel):
        login: str = Field(description="User login for registration",
                           min_length=config.get_config_data("user").get("min_login_length"))
        password: str = Field(description="User password for registration",
                              min_length=config.get_config_data("user").get("min_password_length"))
        full_name: str | None = None

    def get_password_hash(password):
        return pwd_context.hash(password)

    @app.post("/users/registration")
    async def registration(user_data: Annotated[RegisterUser, Body()]):
        if user_data.login not in db.get_users_logins():
            hashed_password = get_password_hash(user_data.password)
            if not db.add_user(user_data.login, hashed_password, user_data.full_name):
                raise HTTPException(status_code=402, detail="An error occurred adding to db")
        else:
            raise HTTPException(status_code=401, detail="User already existed")


if __name__ == '__main__':
    logger = Logger(version)
    config = Config(config_path)
    db = setup_db()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
    app = FastAPI()
    main()
    uvicorn.run(app, host="0.0.0.0", port=8000)