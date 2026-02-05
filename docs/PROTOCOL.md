# PRMISSION PROTOCOL — Full Technical Specification

**Consent-Based Data Exchange for AI Agent Networks**
**Interoperability Specification**

Cos-Prmission × OpenClaw × ECCO
Version 1.0 | February 2026

> **CONFIDENTIAL DRAFT**

---

## Table of Contents

1. Executive Summary
2. System Architecture
3. Protocol Rules
4. Data Objects
5. Scenarios
6. Workspace and Installation
7. Agent Selection and Scoring
8. SDK and GUI Reference
9. Regulatory Alignment
10. Roadmap
11. Appendix

---

## 1. Executive Summary

The Prmission Protocol defines a universal, consent-first framework for data exchange between merchants, consumers, and AI agents. It bridges three open-source ecosystems:

- **Cos-Prmission** — The SDK and GUI for managing explicit user consent-to-consent payments.
- **OpenClaw** — A personal AI assistant gateway with multi-channel reach.
- **ECCO** — A peer-to-peer network for discovery, negotiation, and settlement.

The core thesis is simple: when the product is consent, and a consumer pays directly for consent, customer acquisition costs drop, compliance risk disappears by design, and engagement becomes voluntary and durable. Consent is encoded into machine-readable rules that agents can enforce autonomously across the mesh, with OpenClaw serving as the users representative at all times.

---

## 2. System Architecture

### 2.1 Pillars

The protocol is built on three pillars corresponding to its three sub-projects: consent management (Cos-Prmission), agent orchestration (OpenClaw), and peer-to-peer commerce (ECCO).

### 2.2 Data Flow Overview

The system operates in a three-layer stack:

- **Bottom layer (ECCO):** Nodes provide transport to each other via mDNS (local) or DHT (global) and advertise capabilities via gossip pub/sub. Handles discovery and on-chain settlement.
- **Middle layer (OpenClaw):** Acts as the user-side agent. It receives inbound messages from any merchant, routes them to the appropriate runtime tools and skills on behalf of the user.
- **Top layer (Cos-Prmission):** The consent logic layer. Issues and manages permission tokens, tracks state, and orchestrates micro-transactions.

### 2.3 Integration Topology

- **Device:** Any user-owned device, paired with an OpenClaw agent node.
- **Merchant:** A Shopify app (or similar), representing business inventory and offers.
- **Mesh:** The ECCO P2P network connecting all participants.
- **Registry:** Optional centralized service (Hono + Postgres + Redis) for analytics and tracking.

All interactions MUST be protocol-compliant.

---

## 3. Protocol Rules

### 3.1 Consent Rules

EXPLICIT-GRANT: No data about a user may be collected or transmitted unless the user has granted specific permission for the specific category and purpose.

GRANULAR-SCOPE: Each permission specifies: (a) a data category (e.g., email, purchase_history), (b) a purpose (e.g., personalized_offer, retargeting), (c) a validity period, and (d) a compensation amount.

REVOCABLE-ANYTIME: A user MAY revoke any permission at any time by broadcasting a Revocation event. Upon receipt, the corresponding data must be deleted within 60 seconds.

NO-SILENT-COLLECTION: Any access violation is flagged, and repeat violations result in reduced reputation scores.

### 3.2 Payment Rules

IN-TRANSACTION: Payment does not get paid separately; it is atomic with the data exchange.

DIRECT-COMPENSATION: Payment flows directly to the user through the ECCO mesh.

PAYMENT-TYPES: Three types are supported. Standard is a one-time invoice. Streaming is pay-per-data-point (continuous). Escrow is milestone-based with third-party stakeholder collateral against misuse.

ATOMIC-SETTLEMENT: All transactions either succeed completely or fail and void.

TRANSPARENT-PRICING: The user always sees the price and may accept or reject it.

NO-HIDDEN-FEES: No intermediary (including the protocol itself) may add undisclosed charges.

### 3.3 Discovery Rules

CAPABILITY-ADVERTISING: Merchants advertise what data they are seeking and what they are offering.

CONSUMER-AVAILABILITY: Users advertise their available data and preferences at minimum.

MATCH-AND-NEGOTIATE: DHT/gossip sessions handle matching. Merchants may reach users through their preferred channel (WhatsApp, Telegram, etc.).

REGISTRY-OPTIONAL: The centralized registry assists with tracking and analytics, but full functionality works without it (pure P2P).

### 3.4 Security and Trust

CRYPTOGRAPHIC-IDENTITY: All participants hold cryptographic identities (Ed25519 key pairs). Private keys never leave the device.

TOKEN-VERIFICATION: Public keys allow any participant to verify any token.

DM-PAIRING: When a user interacts with an unknown merchant, default policy applies.

SANDBOX-ENFORCEMENT: Non-matching or untrusted agents run in sandboxed environments.

DISPUTE-SLASH: After a dispute, repeat violations result in blocklisting.

### 3.5 Data Lifecycle

PURPOSE-BOUND: Data may only be used for the purpose specified in the original permission. Any new use requires a new permission grant.

EXPIRATION: All permissions expire. Data must be deleted or anonymized within 24 hours of expiration, confirmed via a CeaseConfirmation event.

AUDIT-TRAIL: Every permission grant, usage, and revocation produces a full audit trail (if the user opts in).

PORTABLE: All data is exportable in JSON format.

---

## 4. Data Objects

### 4.1 Permission Token

The core data object representing a users consent grant. Contains: user ID, merchant ID, data category, purpose, validity period, compensation terms, and cryptographic signature.

### 4.2 Revocation Event

Broadcast when a user revokes a permission. Contains: token reference, timestamp, and user signature.

### 4.3 Transaction Record

The atomic record of a data-for-payment exchange. Links a permission token to a settlement confirmation.

---

## 5. Scenarios

### 5.1 Happy Path

1. Merchant advertises a data need via the ECCO mesh.
2. OpenClaw (acting on behalf of the user) receives the match.
3. User is notified via their preferred channel (e.g., WhatsApp DM).
4. User approves the permission and sets their price.
5. Cos-Prmission generates a permission token.
6. Data is exchanged and payment funds atomically.
7. Status is set to ACTIVE.

### 5.2 Dispute Path

1. User or merchant detects a problem (e.g., Brand makes unauthorized use of data).
2. A Claim is filed.
3. The dispute is reviewed; if the violation is confirmed, a slash penalty is triggered.
4. Violation is recorded on the audit trail.
5. Repeat offenders are blocklisted.

---

## 6. Workspace and Installation

Install OpenClaw locally at ~/.claw/ and extend with skills (see SKILL.md for details on adding agent capabilities).

---

## 7. Agent Selection and Scoring

Determination / Selection: Weighted scoring model.

Aggregation: Best-rank composite scoring that considers alignment with user preferences and reputation maps across the mesh.

---

## 8. SDK and GUI Reference

### SDK (Python)

The Python library for building on the protocol. Located at sdk/python/.

Key classes: Client (main entry point for merchant integration), ConsentManager (handles permission token lifecycle), Handler (HTTP interface for webhook callbacks), Resolver (resolves agent and merchant identities), ComponentEngine (module for building custom AR/interactive components).

### GUI

Built with Gradio for a dashboard experience, plus standalone Canvas/Artifact views for richer interactions.

---

## 9. Regulatory Alignment

### 9.1 GDPR Alignment

The protocols consent model maps directly to GDPR requirements: consent is freely given, specific, informed, and unambiguous. This eliminates the need for traditional cookie banners and draws a clearer line than scalable opt-out approaches.

### 9.2 CCPA Alignment

Supports Californias right-to-know and right-to-opt-out. Financial compensation for data aligns with the spirit of consumer data rights.

### 9.3 E-Commerce Impact

Eliminates the need for invasive tracking. Instead of populating customer profiles through background data harvesting, everything is called out transparently improving trust and potentially reducing regulatory risk at greater scale than traditional compliance approaches.

---

## 10. Roadmap

Development roadmap and milestones are tracked in the respective project repositories:

- Cos-Prmission: https://github.com/marcosbenaim-hub/Cos-Prmission
- OpenClaw: https://github.com/mvdileet/openclaw
- ECCO: https://github.com/mvdileet/ecco

---

## 11. Appendix

### 11.1 Glossary

Key terms used throughout this specification are defined in context where they first appear. For a consolidated reference, see the glossary in the project documentation.

### 11.2 Related Documentation

- Cos-Prmission docs: https://docs.prmission.ai
- Agent development guide: See AGENTS.md in the respective repos.

---

Prmission Protocol v1.0 — February 2026
