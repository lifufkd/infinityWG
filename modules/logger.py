##########################
#       Created By       #
#          SBR           #
##########################
import logging


##########################

##########################


class Logger:
    def __init__(self):
        super(Logger, self).__init__()
        self.logger = None
        self.init()

    def init(self):
        self.logger = logging.getLogger('my_logger')
        self.logger.setLevel(logging.DEBUG)  # Set the logging level to DEBUG to capture all levels of log messages

        # Create a single formatter
        formatter = logging.Formatter('%(levelname)s::%(asctime)s - %(message)s')

        # Create a file handler that logs all messages
        file_handler = logging.FileHandler('logfile.log')
        file_handler.setFormatter(formatter)

        # Create a stream handler that logs all messages to the console
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)

        # Add the handlers to the logger
        self.logger.addHandler(file_handler)
        self.logger.addHandler(stream_handler)
