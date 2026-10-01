CREATE TYPE "RfqInvitationStatus" AS ENUM ('INVITED', 'RESPONDED', 'DECLINED');

CREATE TABLE "RfqInvitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "rfqId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "status" "RfqInvitationStatus" NOT NULL DEFAULT 'INVITED',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "RfqInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RfqInvitation_rfqId_vendorId_key" ON "RfqInvitation"("rfqId", "vendorId");
CREATE INDEX "RfqInvitation_organizationId_rfqId_status_idx" ON "RfqInvitation"("organizationId", "rfqId", "status");

ALTER TABLE "RfqInvitation" ADD CONSTRAINT "RfqInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqInvitation" ADD CONSTRAINT "RfqInvitation_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqInvitation" ADD CONSTRAINT "RfqInvitation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VendorQuote" ADD CONSTRAINT "VendorQuote_rfqId_vendorId_key" UNIQUE ("rfqId", "vendorId");
