##########################
#       Created By       #
#          SBR           #
##########################
import uvicorn
import sys
from modules.logger import Logger
from modules.config import Config
from modules.utilities import read_json_file, get_city_by_ip
from modules.DB.connectors.mysql import MySql
from modules.DB.connectors.sqlite import Sqlite3
from modules.DB.CRUD import CRUD
from providers.vpn_jantit import VpnJantit

from datetime import datetime, timedelta, timezone
from typing import Annotated
import jwt
from fastapi import Depends, FastAPI, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from pydantic import BaseModel, Field
##########################
config_path = 'config.json'
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

    class RequestConfig(BaseModel):
        country: str | None = None
        server: str | None = None
        server_quality: int = -1

    class GetConfig(BaseModel):
        request_id: int

    def get_password_hash(password):
        return pwd_context.hash(password)

    def verify_password(plain_password, hashed_password):
        return pwd_context.verify(plain_password, hashed_password)

    async def check_user_credentials(login: str, password: str) -> bool:
        password_hash = await db.get_user_hash(login)
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
        if not await db.user_is_exists(token_data.username):
            raise credentials_exception
        return token_data

    async def get_user_id(user: Annotated[TokenData, Depends(get_token_status)]) -> int:
        return await db.get_user_id(user.username)

    async def check_country_existed(country: str) -> dict:
        temp = list()
        data = await read_json_file(logger, "src/selenium/countries.json")
        if not data["status"]:
            return {"status": False, "detail": data["detail"]}
        for _country in data["data"].values():
            temp.append(_country["name"])
        if country not in temp:
            return {"status": False}
        return {"status": True, "country": country}

    @app.post("/users/registration")
    async def registration(user_data: Annotated[RegisterUser, Body()]) -> dict:
        if user_data.username not in await db.get_users_logins():
            hashed_password = get_password_hash(user_data.password)
            if not await db.add_user(user_data.username, hashed_password, user_data.full_name):
                raise HTTPException(status_code=402, detail="An error occurred adding to db")
        else:
            raise HTTPException(status_code=401, detail="User already existed")
        return {"detail": "User successfully registered"}

    @app.post("/users/login")
    async def login_for_access_token(
            form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    ) -> dict:
        user = await check_user_credentials(form_data.username, form_data.password)
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

    @app.post("/request/config")
    async def get_config(user_data: RequestConfig, user_id: Annotated[int, Depends(get_user_id)]) -> dict:
        if user_data.country != "Auto":
            user_server = await check_country_existed(user_data.country)
            if not user_server.get("status"):
                raise HTTPException(status_code=404, detail="Country does not exists")
            country = user_server.get("country")
        else:
            country = None
        parser = VpnJantit(db_connector, config, logger, country, user_data.server,
                           user_id, version=config.get_config_data("version"))
        await parser.init()
        return await parser.get_config()

    @app.post("/get/config")
    async def get_config(user_data: GetConfig, user_id: Annotated[int, Depends(get_user_id)]) -> dict:
        _status = await db.get_config(request_id=user_data.request_id, user_id=user_id)
        if not _status:
            return {"status": False, "config": None, "detail": "request not found or not ready yet"}
        else:
            return {"status": True, "config": _status, "detail": None}

    @app.get("/get/countries")
    async def get_countries(token_status: Annotated[bool, Depends(get_token_status)]) -> dict:
        countries = await read_json_file(logger, "src/selenium/countries.json")
        if not countries["status"]:
            raise HTTPException(status_code=404, detail="Error getting countries")
        return countries["data"]

    @app.post("/update/countries")
    async def get_countries(token_status: Annotated[bool, Depends(get_token_status)]) -> dict:
        parser = VpnJantit(db_connector=db_connector, config=config, logger=logger,
                           version=config.get_config_data("version"))
        await parser.init()
        await parser.refresh_server_list()
        del parser
        return {"status": True}

    @app.post("/update/ip")
    async def get_countries(user_ip: GetIP, user_id: Annotated[int, Depends(get_user_id)]) -> dict:
        new_ip = user_ip.ip
        old_ip = await db.get_user_ip(user_id)
        if new_ip == old_ip:
            return {"status": True, "detail": None}

        _status = await db.update_user_ip(user_id, user_ip.ip)
        if not _status:
            return {"status": False, "detail": "Error updating ip"}

        old_city = await get_city_by_ip(logger, ip_address=old_ip)
        new_city = await get_city_by_ip(logger, ip_address=new_ip)
        if old_city == new_city:
            return {"status": True, "detail": None}

        _status1 = await db.update_user_best_vpn_address(user_id, [])
        _status2 = await db.update_user_best_vpn_countries(user_id, {})
        if not _status1 or not _status2:
            return {"status": False, "detail": "Error deleting old synchronized countries"}

        return {"status": True, "detail": None}

    @app.post("/update/best_vpn_address")
    async def get_countries(vpn_host: BestVpnAddress, user_id: Annotated[int, Depends(get_user_id)]) -> dict:
        _status = db.update_user_best_vpn_address(user_id, vpn_host.host)
        return {"status": _status}

    @app.post("/update/best_vpn_countries")
    async def get_countries(vpn_countries: BestVpnCountries, user_id: Annotated[int, Depends(get_user_id)]) -> dict:
        _status = await db.update_user_best_vpn_countries(user_id, vpn_countries.countries)
        return {"status": _status}


if __name__ == '__main__':
    # TODO: Need code refactoring for FastAPI code in app.py
    # TODO: Relocate countries.json to /src
    config = Config(config_path)
    logger = Logger(version=config.get_config_data("version"))
    db, db_connector = setup_db()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
    app = FastAPI()
    main()
    uvicorn.run(app, host="0.0.0.0", port=8000)