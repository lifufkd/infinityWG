##########################
#       Created By       #
#          SBR           #
##########################
import uvicorn
import sys
from modules.Logger import Logger
from modules.Config import Config
from modules.Utilities import Version, read_json_file
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
version = Version.debug
##########################


def setup_db():
    match config.get_config_data("DB"):
        case "mysql":
            db_connector = MySql(config, logger)
        case "sqlite3":
            db_connector = Sqlite3(config, logger)
        case _:
            logger.error("DB source unfilled or incorrect!")
            sys.exit()
    return CRUD(db_connector), db_connector


def main():

    class UserCreds(BaseModel):
        username: str = Field(description="User login for registration",
                              min_length=config.get_config_data("user").get("min_login_length"))
        full_name: str | None = None

    class RegisterUser(UserCreds):
        password: str = Field(description="User password for registration",
                              min_length=config.get_config_data("user").get("min_password_length"))

    class Token(BaseModel):
        access_token: str
        token_type: str

    class TokenData(BaseModel):
        username: str | None = None

    class GetConfig(BaseModel):
        country: str | None = None
        server: str | None = None

    # class UserInDB(UserCreds):
    #     user_id: int
    #     pwd_hash: str
    #     ip_address: str | None = None
    #     best_vpn_countries: str | None = None
    #     best_vpn_address: str | None = None
    #     created_at: datetime

    # def user_data(username: str) -> UserInDB | bool:
    #     user_dict = db.get_user(username)
    #     if user_dict is None:
    #         return False
    #     return UserInDB(**user_dict)



    def get_password_hash(password):
        return pwd_context.hash(password)

    def verify_password(plain_password, hashed_password):
        return pwd_context.verify(plain_password, hashed_password)

    def check_user_credentials(login: str, password: str) -> bool:
        password_hash = db.get_user_hash(login)
        if not password_hash:
            return False
        if not verify_password(plain_password=password, hashed_password=password_hash):
            return False
        return True

    def create_access_token(data: dict, expires_delta: timedelta | None = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode,
                                 config.get_config_data("access_token").get("server_secret_key"),
                                 algorithm=config.get_config_data("access_token").get("algorithm"))
        return encoded_jwt

    async def get_token_status(token: Annotated[str, Depends(oauth2_scheme)]) -> TokenData:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token,
                                 config.get_config_data("access_token").get("server_secret_key"),
                                 algorithms=[config.get_config_data("access_token").get("algorithm")])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
            token_data = TokenData(username=username)
        except InvalidTokenError:
            raise credentials_exception
        if not db.user_is_exists(token_data.username):
            raise credentials_exception
        return token_data

    async def get_user_id(user: Annotated[TokenData, Depends(get_token_status)]) -> int:
        return db.get_user_id(user.username)

    def check_country_existed(country: str) -> dict:
        data = read_json_file(logger, "src/selenium/countries.json")
        if country not in list(data.keys()):
            return {"status": False}
        return {"status": True, "country": country}

    # async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    #     credentials_exception = HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Could not validate credentials",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )
    #     try:
    #         payload = jwt.decode(token,
    #                              config.get_config_data("access_token").get("server_secret_key"),
    #                              algorithms=[config.get_config_data("access_token").get("algorithm")])
    #         username: str = payload.get("sub")
    #         if username is None:
    #             raise credentials_exception
    #         token_data = TokenData(username=username)
    #     except InvalidTokenError:
    #         raise credentials_exception
    #     user = user_data(username=token_data.username)
    #     if user is None:
    #         raise credentials_exception
    #     return user

    @app.post("/users/registration")
    async def registration(user_data: Annotated[RegisterUser, Body()]):
        if user_data.username not in db.get_users_logins():
            hashed_password = get_password_hash(user_data.password)
            if not db.add_user(user_data.username, hashed_password, user_data.full_name):
                raise HTTPException(status_code=402, detail="An error occurred adding to db")
        else:
            raise HTTPException(status_code=401, detail="User already existed")

    @app.post("/token")
    async def login_for_access_token(
            form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    ) -> Token:
        user = check_user_credentials(form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=config.get_config_data("access_token").get("expire_minutes"))
        access_token = create_access_token(
            data={"sub": form_data.username}, expires_delta=access_token_expires
        )
        return Token(access_token=access_token, token_type="bearer")

    @app.get("/users/check/token", response_model=dict)
    async def read_users_me(
            token_status: Annotated[bool, Depends(get_token_status)],
    ):
        return {"status": True}

    @app.post("/get/config")
    async def get_config(user_data: GetConfig, user_id: Annotated[int, Depends(get_user_id)]) -> dict:
        user_server = check_country_existed(user_data.country)
        if not user_server.get("status"):
            raise HTTPException(status_code=404, detail="Country does not exists")
        parser = VpnJantit(db_connector, config, logger, user_server.get("country"), user_data.server,
                           user_id, version)
        return parser.get_config()

    @app.get("/get/countries")
    async def get_countries(token_status: Annotated[bool, Depends(get_token_status)]) -> dict:
        if token_status:
            return read_json_file(logger, "src/selenium/countries.json")


if __name__ == '__main__':
    logger = Logger(version)
    config = Config(config_path)
    db, db_connector = setup_db()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
    app = FastAPI()
    main()
    uvicorn.run(app, host="0.0.0.0", port=8000)