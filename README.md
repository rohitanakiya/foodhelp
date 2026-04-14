# 🍽️ AI Food Recommendation Backend

## 🚀 Project Overview

This project is a **backend system for an AI-powered food recommendation engine**.

The goal is to allow users to input natural language queries like:

> *"cheap high protein veg food in bangalore"*
> *"light but filling food"*

…and receive **intelligent food recommendations** based on:

* semantic understanding (AI-like behavior)
* nutritional data (protein, calories)
* restaurant ratings
* user intent

---

## 🧠 Core Idea

Traditional systems rely only on filters (price, veg, etc.).

This system goes beyond that by combining:

```
Natural Language Input
        ↓
Intent Extraction (rule-based NLP)
        ↓
Embedding Generation (vector representation)
        ↓
Cosine Similarity (semantic matching)
        ↓
Hybrid Scoring (AI-like ranking)
        ↓
Top Food Recommendations
```

---

## 🏗️ Tech Stack

* **Backend:** Node.js + TypeScript
* **Framework:** Express
* **Database:** PostgreSQL
* **Authentication:** JWT
* **ORM/DB Access:** pg (node-postgres)
* **AI Layer (current):** Simulated embeddings + cosine similarity

---

## 📦 Features Implemented

### 🔐 Authentication System

* User signup & login
* Password hashing
* JWT-based authentication
* Protected routes

---

### 👤 Profile Module

* Fetch user profile (`/profile/me`)
* Middleware-based authentication

---

### 🍴 Food Database

* `restaurants` table
* `menu_items` table with:

  * price
  * veg/non-veg
  * protein
  * calories
  * description

---

### 🔎 Menu Filtering API

* Filter by:

  * city
  * veg
  * protein
  * price
* Efficient SQL queries with indexing

---

### 🧠 Natural Language Parsing

Converts user input into structured filters:

Example:

```
"cheap veg high protein food"
↓
{ veg: true, maxPrice: 300, minProtein: 20 }
```

---

### 🤖 Semantic Recommendation System

#### Step 1: Embedding (Simulated)

* Converts text → vector representation

#### Step 2: Similarity Matching

* Uses **cosine similarity** to compare:

  * user query
  * menu items

#### Step 3: Hybrid Scoring

Final score combines:

* semantic similarity
* protein content
* restaurant rating

---

### 📡 API Endpoint

#### POST `/chat/recommend`

Request:

```json
{
  "text": "light but filling food"
}
```

Response:

```json
{
  "filters": {},
  "recommendations": [...]
}
```

---

## 🧪 Example Queries

* "cheap veg food in bangalore"
* "high protein meal"
* "light but filling food"
* "budget healthy options"

---

## ⚠️ Current Limitations

* Uses **fake embeddings** (for learning/demo purposes)
* No real vector database yet
* Limited dataset (sample data only)
* Rule-based NLP (not full LLM yet)

---

## 🔮 Future Improvements

* 🔗 Integrate real embeddings (OpenAI)
* 📊 Use vector DB (pgvector / Pinecone)
* 🧠 Replace rule-based parsing with LLM
* 📱 Build frontend UI
* 📍 Add location-based recommendations
* 👤 Personalization (user preferences)

---

## 🧠 What This Project Demonstrates

* Backend system design
* Database modeling & optimization
* API architecture
* Authentication & security
* NLP basics (intent extraction)
* Vector similarity concepts
* AI system thinking (RAG foundation)

---

## ⚡ Getting Started

```bash
npm install
npm run dev
```

Server runs on:

```
http://localhost:4000
```

---

## 👨‍💻 Author

Built as a learning project to understand:

> **How real-world AI-backed backend systems are designed and implemented.**

---

## ⭐ Final Note

This is not just a CRUD backend —
it’s a **foundation for an AI-powered recommendation system**.

---
