FROM php:8.2-cli

# Install system dependencies and PHP extensions required by Composer, Guzzle, and database drivers
RUN apt-get update \
	&& apt-get install -y \
		git \
		unzip \
		libzip-dev \
		libonig-dev \
		libpq-dev \
	&& docker-php-ext-configure zip \
	&& docker-php-ext-install zip mbstring pdo_pgsql \
	&& rm -rf /var/lib/apt/lists/*

# Install Composer from the official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy only composer files first to leverage Docker cache
COPY composer.json ./

RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# Copy application source
COPY . ./

# Ensure optimized autoloader after sources are copied
RUN composer dump-autoload --optimize

EXPOSE 8181

CMD ["php", "-d", "variables_order=EGPCS", "-d", "auto_prepend_file=", "-d", "auto_append_file=", "-d", "upload_max_filesize=60M", "-d", "post_max_size=65M", "-d", "max_execution_time=120", "-d", "max_input_time=120", "-S", "0.0.0.0:8181", "-t", "public"]
