# How to Add Room Amenities in Postman

## Hotel Room Structure

When creating a hotel with rooms, each room can have amenities. Here's how to structure the request in Postman:

## Request Format

### Method: POST
### URL: `/createNewHotel`
### Headers:
- `Authorization: Bearer <admin_token>`
- `Content-Type: multipart/form-data`

### Body (form-data):

#### Basic Hotel Fields:
```
name: "Grand Hotel"
description: "A luxurious hotel in the city center"
address: {"street":"123 Main St","city":"New York","state":"NY","country":"USA","zipCode":"10001"}
location: {"lat":40.7128,"lng":-74.0060}
amenities: ["WiFi","Pool","Gym","Spa"]
priceRange: {"min":100,"max":500}
Rent: 300
ourService: {"connectVieCall":"+1234567890","connectVieMessage":"support@hotel.com","helpSupport":"24/7"}
```

#### Room Images:
- Field name: `roomImages_0` (for first room)
- Field name: `roomImages_1` (for second room)
- Type: File
- Upload multiple images per room

#### Hotel Images:
- Field name: `hotelImages`
- Type: File
- Upload multiple images

#### Rooms Data (JSON string):
```
rooms: [
  {
    "type": "Deluxe Room",
    "pricePerNight": 150,
    "maxGuests": 2,
    "amenities": ["WiFi", "TV", "AC", "Mini Bar", "Room Service"]
  },
  {
    "type": "Suite",
    "pricePerNight": 300,
    "maxGuests": 4,
    "amenities": ["WiFi", "TV", "AC", "Mini Bar", "Room Service", "Jacuzzi", "Balcony"]
  }
]
```

## Example Room Amenities Array

Each room's `amenities` field is an array of strings. Common amenities include:

```json
[
  "WiFi",
  "TV",
  "AC",
  "Mini Bar",
  "Room Service",
  "Jacuzzi",
  "Balcony",
  "Ocean View",
  "City View",
  "Kitchenette",
  "Coffee Maker",
  "Safe",
  "Work Desk",
  "Sofa",
  "Bathtub",
  "Shower",
  "Hair Dryer",
  "Iron",
  "Refrigerator",
  "Microwave"
]
```

## Complete Postman Example

### Step 1: Set Headers
```
Authorization: Bearer your_admin_token_here
```

### Step 2: Body (form-data)

| Key | Type | Value |
|-----|------|-------|
| name | Text | Grand Hotel |
| description | Text | A luxurious hotel |
| address | Text | `{"street":"123 Main St","city":"New York","state":"NY","country":"USA","zipCode":"10001"}` |
| location | Text | `{"lat":40.7128,"lng":-74.0060}` |
| amenities | Text | `["WiFi","Pool","Gym","Spa"]` |
| priceRange | Text | `{"min":100,"max":500}` |
| Rent | Text | 300 |
| rooms | Text | `[{"type":"Deluxe Room","pricePerNight":150,"maxGuests":2,"amenities":["WiFi","TV","AC","Mini Bar"]}]` |
| hotelImages | File | (select image files) |
| roomImages_0 | File | (select images for room 0) |
| roomImages_1 | File | (select images for room 1) |

## Important Notes:

1. **Room Index**: Room images must match the room index in the `rooms` array
   - First room (index 0) → `roomImages_0`
   - Second room (index 1) → `roomImages_1`
   - Third room (index 2) → `roomImages_2`
   - And so on...

2. **JSON Strings**: Fields like `address`, `location`, `amenities`, `priceRange`, and `rooms` should be sent as JSON strings (not objects)

3. **Room Amenities**: Each room's `amenities` is an array of strings within the room object

4. **Multiple Images**: You can upload multiple images for each room by selecting multiple files for the same field name

## Example cURL Command:

```bash
curl -X POST \
  http://localhost:3000/createNewHotel \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'name=Grand Hotel' \
  -F 'description=Luxurious hotel' \
  -F 'address={"street":"123 Main St","city":"New York","state":"NY","country":"USA","zipCode":"10001"}' \
  -F 'location={"lat":40.7128,"lng":-74.0060}' \
  -F 'amenities=["WiFi","Pool","Gym"]' \
  -F 'priceRange={"min":100,"max":500}' \
  -F 'Rent=300' \
  -F 'rooms=[{"type":"Deluxe Room","pricePerNight":150,"maxGuests":2,"amenities":["WiFi","TV","AC","Mini Bar"]}]' \
  -F 'hotelImages=@/path/to/hotel-image1.jpg' \
  -F 'hotelImages=@/path/to/hotel-image2.jpg' \
  -F 'roomImages_0=@/path/to/room1-image1.jpg' \
  -F 'roomImages_0=@/path/to/room1-image2.jpg'
```

## Response Example:

```json
{
  "success": true,
  "message": "Hotel created successfully",
  "result": {
    "_id": "...",
    "name": "Grand Hotel",
    "rooms": [
      {
        "type": "Deluxe Room",
        "pricePerNight": 150,
        "maxGuests": 2,
        "amenities": ["WiFi", "TV", "AC", "Mini Bar"],
        "images": ["https://s3.../room1-image1.jpg", "https://s3.../room1-image2.jpg"]
      }
    ],
    ...
  }
}
```

