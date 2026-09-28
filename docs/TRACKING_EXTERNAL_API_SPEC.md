# Tracking External API Specification

## Overview

This project exposes two container tracking endpoints:

1. `/api/tracking`
Used by the main website tracking page. This endpoint is currently unauthenticated and accepts `POST` requests.

2. `/api/public/tracking`
Recommended for cross-site or third-party use. This endpoint requires an API key and accepts both `GET` and `POST` requests.

Both endpoints return the same normalized tracking payload.

## Providers Behind The API

The server aggregates tracking data internally from:

1. PGL public tracking API as the primary provider.
2. TimeToCargo as a fallback provider when PGL data is incomplete or unavailable.

Consumers should treat this server response as the contract and should not depend on the upstream provider payloads.

## Base URL

Production example:

```text
https://www.jacxishipping.com
```

## Endpoint 1: Website Tracking API

### Request

`POST /api/tracking`

Headers:

```http
Content-Type: application/json
```

Body:

```json
{
  "trackNumber": "UETU6059142"
}
```

Accepted body fields:

- `trackNumber`
- `trackingNumber`

### Success Response

Status: `200 OK`

```json
{
  "tracking": {
    "containerNumber": "UETU6059142",
    "containerType": "40HC",
    "shipmentStatus": "In Transit - Ocean",
    "origin": "Los Angeles, United States",
    "originDate": "2026-05-01T00:00:00.000Z",
    "pol": "Los Angeles, United States",
    "polDate": "2026-05-03T00:00:00.000Z",
    "destination": "Jebel Ali, United Arab Emirates",
    "destinationDate": "2026-05-28T00:00:00.000Z",
    "pod": "Jebel Ali, United Arab Emirates",
    "podDate": "2026-05-28T00:00:00.000Z",
    "estimatedDeparture": "2026-05-03T00:00:00.000Z",
    "estimatedArrival": "2026-05-28T00:00:00.000Z",
    "company": {
      "name": "Maersk",
      "url": null,
      "scacs": []
    },
    "currentLocation": "Pacific Ocean",
    "lastUpdated": "2026-05-14T08:30:00.000Z",
    "progress": 60,
    "requestedNumber": "UETU6059142",
    "customerTracking": {
      "milestones": []
    },
    "events": [
      {
        "id": "UETU6059142-0",
        "status": "In Transit - Ocean",
        "location": "Pacific Ocean",
        "timestamp": "2026-05-14T08:30:00.000Z",
        "actual": true,
        "vessel": "MSC Example",
        "voyage": "019W",
        "description": "Vessel: MSC Example"
      }
    ]
  }
}
```

### Error Responses

`400 Bad Request`

```json
{
  "message": "Track number is required."
}
```

`404 Not Found`

```json
{
  "message": "No tracking information found for this number."
}
```

`500 Internal Server Error`

```json
{
  "message": "Failed to fetch tracking information."
}
```

## Endpoint 2: Public API-Key Tracking API

### Request Modes

Recommended for another website:

1. `GET /api/public/tracking?trackNumber=UETU6059142`
2. `POST /api/public/tracking`

### Authentication

Provide either header format:

```http
Authorization: Bearer YOUR_PUBLIC_TRACKING_API_KEY
```

or

```http
X-API-Key: YOUR_PUBLIC_TRACKING_API_KEY
```

### Environment Variables

Configure one of these on the server:

```bash
PUBLIC_TRACKING_API_KEY="single-key-value"
```

or

```bash
PUBLIC_TRACKING_API_KEYS="key-one,key-two,key-three"
```

`PUBLIC_TRACKING_API_KEYS` is useful for key rotation or multiple client websites.

### GET Example

```bash
curl -X GET "https://www.jacxishipping.com/api/public/tracking?trackNumber=UETU6059142" \
  -H "Authorization: Bearer YOUR_PUBLIC_TRACKING_API_KEY"
```

### POST Example

```bash
curl -X POST "https://www.jacxishipping.com/api/public/tracking" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_PUBLIC_TRACKING_API_KEY" \
  -d '{"trackNumber":"UETU6059142"}'
```

### Success Response

Status: `200 OK`

Response body is identical to `/api/tracking`.

### Public API Error Responses

`400 Bad Request`

```json
{
  "message": "Track number is required."
}
```

`401 Unauthorized`

```json
{
  "message": "Unauthorized"
}
```

`404 Not Found`

```json
{
  "message": "No tracking information found for this number."
}
```

`500 Internal Server Error`

```json
{
  "message": "Failed to fetch tracking information."
}
```

`503 Service Unavailable`

```json
{
  "message": "Public tracking API is not configured."
}
```

## Response Field Reference

Top-level object:

- `tracking.containerNumber`: normalized container number returned by the provider.
- `tracking.containerType`: container type when available.
- `tracking.shipmentStatus`: latest status label.
- `tracking.origin`: origin location.
- `tracking.originDate`: origin date in ISO-8601 format.
- `tracking.pol`: port of loading.
- `tracking.polDate`: loading or departure date in ISO-8601 format.
- `tracking.destination`: destination location.
- `tracking.destinationDate`: destination-related date in ISO-8601 format.
- `tracking.pod`: port of discharge.
- `tracking.podDate`: port of discharge date in ISO-8601 format.
- `tracking.estimatedDeparture`: estimated departure timestamp in ISO-8601 format.
- `tracking.estimatedArrival`: estimated arrival timestamp in ISO-8601 format.
- `tracking.company`: shipping line metadata when available.
- `tracking.currentLocation`: latest known location.
- `tracking.lastUpdated`: newest event timestamp.
- `tracking.progress`: integer progress percentage.
- `tracking.requestedNumber`: exact tracking number requested by the client.
- `tracking.customerTracking`: customer-facing milestone view derived by the server.
- `tracking.events`: normalized timeline events.

Event object:

- `id`: stable event identifier within the response.
- `status`: normalized event status.
- `statusCode`: provider-specific code when available.
- `location`: event location.
- `terminal`: terminal name when available.
- `timestamp`: event time in ISO-8601 format.
- `actual`: whether the event is completed/actual.
- `vessel`: vessel name when available.
- `voyage`: voyage number when available.
- `description`: enriched event description.

## Integration Guidance For Another Website

Use `/api/public/tracking` for any external website or server-to-server integration.

Recommended pattern:

1. Store the API key on the server side of the consuming website.
2. Call `GET /api/public/tracking?trackNumber=...` from that server or from a secure serverless function.
3. Render the returned `tracking` object directly in the other website UI.

Avoid calling upstream provider APIs directly from the consuming site because the upstream provider contract may change independently of this project.
