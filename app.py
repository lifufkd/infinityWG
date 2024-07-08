##########################
#       Created By       #
#          SBR           #
##########################
import sys
from modules.Logger import Logger
from modules.Config import Config
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
            db_connector = MySql(config, logger)
        case "sqlite3":
            db_connector = Sqlite3(config, logger)
        case _:
            logger.error("DB source unfilled or incorrect!")
            sys.exit()
    jantit = VpnJantit(db_connector, config, logger, "", "", "", version)
    jantit.get_config()


def main() -> None:
    pass


if __name__ == '__main__':
    logger = Logger(version)
    config = Config(config_path)
    start_setup()
    main()