##########################
#       Created By       #
#          SBR           #
##########################
from modules.logger import Logger
from modules.config import Config
from modules.DB.mysql import MySql
##########################
config_path = 'config.json'
##########################


def main() -> None:
    pass


if __name__ == '__main__':
    logger = Logger()
    config = Config(config_path)
    db = MySql(logger)
    main()