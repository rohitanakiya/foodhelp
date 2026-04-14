CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    city TEXT NOT NULL CHECK (char_length(trim(city)) > 0),

    rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(name, city)
);