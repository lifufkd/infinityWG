##########################
#       Created By       #
#          SBR           #
##########################
import sys
import time
from typing import Optional
from modules.Logger import Logger
from modules.Config import Config
from twocaptcha import TwoCaptcha
##########################


class CaptchaSolver:
    def __init__(self, config: 'Config' = None, logger: 'Logger' = None):
        super(CaptchaSolver, self).__init__()
        self._logger = logger
        self._config = config
        self._solver: TwoCaptcha | None = None
        self.init()

    def init(self):
        config = {
            'server': '2captcha.com',
            'apiKey': self._config.get_config_data("2captcha_apiKey"),
            'softId': 1
        }
        self._solver = TwoCaptcha(**config)

    def normal_captcha(self, image_path: str) -> Optional[str]:
        return self._solver.normal(image_path)

    def auto_captcha(self, audio_path: str, lang: str = 'EN') -> Optional[str]:
        return self._solver.auto(audio_path, lang=lang)

    def text_captcha(self, text: str) -> Optional[str]:
        return self._solver.text(text)

    def recaptcha_v2(self, site_key: str, captcha_url: str) -> Optional[dict]:
        return self._solver.recaptcha(
            sitekey=site_key,
            url=captcha_url,
        )

    def recaptcha_v3(self, site_key: str, captcha_url: str) -> Optional[str]:
        return self._solver.recaptcha(
            sitekey=site_key,
            url=captcha_url,
            version='v3',
        )

    def fun_captcha(self, site_key: str, captcha_url: str) -> Optional[str]:
        return self._solver.funcaptcha(
            sitekey=site_key,
            url=captcha_url,
        )

    def gee_test(self, gt: str, challenge: str, captcha_url: str) -> Optional[str]:
        return self._solver.geetest(
            gt=gt,
            challenge=challenge,
            url=captcha_url
        )

    def gee_test_v4(self, captcha_id: str, captcha_url: str) -> Optional[str]:
        return self._solver.geetest_v4(
            captcha_id=captcha_id,
            url=captcha_url
        )

    def hcaptcha(self, site_key: str, captcha_url: str) -> Optional[str]:
        return self._solver.hcaptcha(
            sitekey=site_key,
            url=captcha_url,
        )

    def lemin(self, captcha_id: str, div_id: str, captcha_url: str) -> Optional[str]:
        return self._solver.lemin(
            captcha_id=captcha_id,
            div_id=div_id,
            url=captcha_url
        )

    def cloudflare_turnstile(self,
                             sitekey: str,
                             captcha_url: str,
                             data: str | None = None,
                             pagedata: str | None = None,
                             action: str | None = None,
                             user_agent: str | None = None,
                             full: bool = False) -> Optional[dict]:
        if full:
            return self._solver.turnstile(
                sitekey=sitekey,
                url=captcha_url,
                data=data,
                pagedata=pagedata,
                action=action,
                useragent=user_agent
            )
        else:
            return self._solver.turnstile(
                sitekey=sitekey,
                url=captcha_url
            )
