##########################
#       Created By       #
#          SBR           #
##########################
import sys
from modules.logger import Logger
from modules.config import Config
from modules.DB.connectors.mysql import MySql
from modules.DB.connectors.sqlite import Sqlite3
from wg_providers.VpnJantit import VpnJantit
##########################
config_path = 'config.json'
version = 'debug'
##########################


def start_setup() -> None:
    match config.get_config_data("DB"):
        case "mysql":
            db_connector = MySql(logger)
        case "sqlite3":
            sqlite3_path = config.get_config_data("sqlite3_db_path")
            if sqlite3_path is not None:
                db_connector = Sqlite3(sqlite3_path)
            else:
                logger.logger.error("Path to Sqlite3 DB unfilled or incorrect!")
                sys.exit()
        case _:
            logger.logger.error("DB source unfilled or incorrect!")
            sys.exit()
    jantit = VpnJantit(db_connector, config, logger, version)



def main() -> None:
    pass


if __name__ == '__main__':
    logger = Logger()
    config = Config(config_path)
    start_setup()
    main()