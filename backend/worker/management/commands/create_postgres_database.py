import os
import psycopg
from django.core.management.base import BaseCommand, CommandError
from dotenv import load_dotenv


class Command(BaseCommand):
    help = "Creates the configured PostgreSQL database when it does not exist."

    def handle(self, *args, **options):
        load_dotenv(".env")
        name = os.environ.get("DB_NAME")
        if not name or not name.replace("_", "").isalnum():
            raise CommandError("DB_NAME must contain only letters, digits, and underscores.")
        try:
            with psycopg.connect(
                host=os.environ["DB_HOST"], port=os.environ.get("DB_PORT", "5432"),
                user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"], dbname="postgres",
                autocommit=True,
            ) as connection:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", [name])
                    if cursor.fetchone():
                        self.stdout.write("Database already exists.")
                    else:
                        cursor.execute(f'CREATE DATABASE "{name}"')
                        self.stdout.write(self.style.SUCCESS(f"Created database {name}."))
        except psycopg.Error as exc:
            raise CommandError(f"Could not create database: {exc}") from exc
