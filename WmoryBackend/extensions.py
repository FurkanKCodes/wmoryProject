# extensions.py
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize Limiter with IP address as the key function
limiter = Limiter(key_func=get_remote_address)