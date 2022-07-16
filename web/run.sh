#!/usr/bin/env bash

# pip install twisted
# pip install pyOpenSSL
# pip install service_identity
twistd -n web --path=./ --https=4443 -c cert.pem -k key.pem
