ALTER TABLE "Shipment"
DROP CONSTRAINT IF EXISTS "Shipment_transit_workflow_check";

ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_transit_workflow_check"
CHECK (
  (
    "transitId" IS NULL
    AND "status"::text <> 'IN_TRANSIT_TO_DESTINATION'
  )
  OR
  (
    "transitId" IS NOT NULL
    AND "status"::text IN ('IN_TRANSIT_TO_DESTINATION', 'DELIVERED')
  )
) NOT VALID;