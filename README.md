# Cos-Prmission

Prmission SDK on the Dileet/Ecco repo

## "Prmission"

### Executive Truths for Shopify / Major Brands

- **"Permission is the product — data is the by-product."**

- **"Merchants already pay for customers; Prmission lets them pay the right customers directly."**

- **"Lower CAC comes from certainty, not scale — explicit permission replaces guesswork."**

- **"Paying customers directly eliminates wasted spend and improves conversion immediately."**

- **"This is not a new ad channel; it's a reallocation of existing ad spend."**

- **"Consent built into the transaction removes compliance risk by design."**

- **"ECCO provides trust, enforcement, and scale — without platforms owning data."**

- **"When customers are compensated, engagement becomes voluntary and durable."**

- **"If merchants can lower CAC by paying customers directly, the ad market becomes optional — not mandatory."**

---

## About

Prmission SDK/GUI MVP DEMO on the Repo Dileet/Ecco

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRMISSION SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────┐     ┌───────────┐     ┌───────────────────┐    │
│   │  MERCHANT │────▶│  PRMISSION│────▶│     CUSTOMER      │    │
│   │ (Shopify) │     │    SDK    │     │  (Compensated)    │    │
│   └───────────┘     └───────────┘     └───────────────────┘    │
│         │                 │                     │               │
│         │                 ▼                     │               │
│         │         ┌───────────────┐             │               │
│         └────────▶│     ECCO      │◀────────────┘               │
│                   │ (Trust Layer) │                             │
│                   └───────────────┘                             │
│                          │                                      │
│                          ▼                                      │
│                   ┌───────────────┐                             │
│                   │   CONSENT &   │                             │
│                   │  ENFORCEMENT  │                             │
│                   └───────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## SDK Installation

```bash
pip install prmission-sdk
```

## Quick Start

```python
from prmission import PrmissionClient

# Initialize client
client = PrmissionClient(api_key="your_api_key")

# Create a permission request
permission = client.create_permission(
    merchant_id="merchant_123",
    customer_email="customer@example.com",
    compensation_amount=5.00,
    data_scope=["email", "purchase_history"]
)

# Check permission status
status = client.get_permission_status(permission.id)
```

## Key Features

- **Direct Customer Compensation** - Pay customers for their data permissions
- **Consent Management** - Built-in GDPR/CCPA compliant consent flows
- **ECCO Integration** - Trust and enforcement layer
- **Shopify Ready** - Native integration with Shopify stores
- **Lower CAC** - Reduce customer acquisition costs through certainty

## License

MIT License
