CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    restaurant_id UUID NOT NULL 
        REFERENCES restaurants(id) ON DELETE CASCADE,

    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),

    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),

    veg BOOLEAN NOT NULL DEFAULT FALSE,

    protein INTEGER NOT NULL CHECK (protein >= 0),

    calories INTEGER NOT NULL CHECK (calories >= 0),

    description TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(restaurant_id, name)
);