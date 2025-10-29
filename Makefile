PYTHON ?= python
MANAGE := $(PYTHON) backend/manage.py
FRONTEND_WEB_DIR := frontend-web
FRONTEND_MOBILE_DIR := frontend-movil

.PHONY: install migrate run seed test lint fmt

install:
	$(PYTHON) -m pip install -r backend/requirements.txt
	cd $(FRONTEND_WEB_DIR) && npm install
	cd $(FRONTEND_MOBILE_DIR) && flutter pub get

migrate:
	$(MANAGE) migrate

run:
	$(MANAGE) runserver 0.0.0.0:8000

seed:
	$(MANAGE) seed_demo

test:
	$(MANAGE) test

