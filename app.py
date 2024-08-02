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
version = Version.release
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

    class GetIP(BaseModel):
        ip: str

    class BestVpnAddress(BaseModel):
        host: list[str]

    class BestVpnCountries(BaseModel):
        countries: dict

    class TokenData(BaseModel):
        username: str | None = None

    class GetConfig(BaseModel):
        country: str | None = None
        server: str | None = None

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
        temp = list()
        data = read_json_file(logger, "src/selenium/countries.json")
        for _country in data.values():
            temp.append(_country["name"])
        if country not in temp:
            print(11111)
            return {"status": False}
        return {"status": True, "country": country}

    @app.post("/users/registration")
    async def registration(user_data: Annotated[RegisterUser, Body()]) -> dict:
        if user_data.username not in db.get_users_logins():
            hashed_password = get_password_hash(user_data.password)
            if not db.add_user(user_data.username, hashed_password, user_data.full_name):
                raise HTTPException(status_code=402, detail="An error occurred adding to db")
        else:
            raise HTTPException(status_code=401, detail="User already existed")
        return {"detail": "User successfully registered"}

    @app.post("/users/login")
    async def login_for_access_token(
            form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    ) -> dict:
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
        return {"access_token": access_token, "token_type": "bearer", "detail": "User successfully authenticated"}

    @app.get("/users/check/token", response_model=dict)
    async def check_token(
            token_status: Annotated[bool, Depends(get_token_status)],
    ):
        return {"detail": "Token is valid"}

    @app.post("/get/config")
    async def get_config(user_data: GetConfig, user_id: Annotated[int, Depends(get_user_id)]) -> dict:
        if user_data.country != "Auto":
            user_server = check_country_existed(user_data.country)
            if not user_server.get("status"):
                raise HTTPException(status_code=404, detail="Country does not exists")
            country = user_server.get("country")
        else:
            country = None
        parser = VpnJantit(db_connector, config, logger, country, user_data.server,
                           user_id, version)
        _config = parser.get_config()
        del parser
        return _config

    @app.get("/get/countries")
    async def get_countries(token_status: Annotated[bool, Depends(get_token_status)]) -> dict:
        if token_status:
            return read_json_file(logger, "src/selenium/countries.json")

    @app.post("/update/countries")
    async def get_countries(token_status: Annotated[bool, Depends(get_token_status)]) -> dict:
        if token_status:
            parser = VpnJantit(db_connector=db_connector, config=config, logger=logger, version=version)
            parser.refresh_server_list()
            del parser
            return {"status": True}

    @app.post("/update/ip")
    async def get_countries(user_ip: GetIP, user_id: Annotated[int, Depends(get_user_id)]) -> dict:
        _status = db.update_user_ip(user_id, user_ip.ip)
        return {"status": _status}

    @app.post("/update/best_vpn_address")
    async def get_countries(vpn_host: BestVpnAddress, user_id: Annotated[int, Depends(get_user_id)]) -> dict:
        _status = db.update_user_best_vpn_address(user_id, vpn_host.host)
        return {"status": _status}

    @app.post("/update/best_vpn_countries")
    async def get_countries(vpn_countries: BestVpnCountries, user_id: Annotated[int, Depends(get_user_id)]) -> dict:
        _status = db.update_user_best_vpn_countries(user_id, vpn_countries.countries)
        return {"status": _status}


if __name__ == '__main__':
    # TODO: Need code refactoring for FastAPI code in app.py
    # TODO: Relocate countries.json to /src
    logger = Logger(version)
    config = Config(config_path)
    db, db_connector = setup_db()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
    app = FastAPI()
    main()
    uvicorn.run(app, host="0.0.0.0", port=8000)