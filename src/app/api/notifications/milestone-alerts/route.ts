import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { 
  getMilestoneAlertConfig, 
  saveMilestoneAlertConfig, 
  dispatchMilestoneAlert, 
  DEFAULT_MILESTONE_TEMPLATES,
  type MilestoneEventData,
  type MilestoneType
} from '@/lib/notifications/milestone-alerts';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const config = await getMilestoneAlertConfig();
    return NextResponse.json({
      config,
      defaultTemplates: DEFAULT_MILESTONE_TEMPLATES,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to get milestone alerts config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const canManage = hasPermission(session.user?.role, 'shipments:manage') || hasPermission(session.user?.role, 'containers:manage');
    if (!canManage) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action || 'trigger';

    if (action === 'save_config') {
      const updated = await saveMilestoneAlertConfig(body.config);
      return NextResponse.json({ success: true, config: updated });
    }

    // Trigger or Test an alert
    const eventData: MilestoneEventData = {
      milestone: body.milestone || 'VESSEL_DEPARTED',
      milestoneLabel: body.milestoneLabel || 'Vessel Departed',
      shipmentId: body.shipmentId,
      containerId: body.containerId,
      customerName: body.customerName || 'John Doe',
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      vehicleInfo: body.vehicleInfo || '2023 Toyota RAV4 XLE',
      vin: body.vin || '4T3WFREV0PU104928',
      lotNumber: body.lotNumber || '62948102',
      containerNumber: body.containerNumber || 'MSKU9048123',
      vesselName: body.vesselName || 'MAERSK VOYAGER',
      originPort: body.originPort || 'Port of Newark (USNWK)',
      destinationPort: body.destinationPort || 'Port of Jebel Ali (AEJEA)',
      etaDate: body.etaDate || 'Oct 14, 2026',
      trackingUrl: body.trackingUrl || `https://jacxishipping.com/tracking?vin=${body.vin || '4T3WFREV0PU104928'}`,
    };

    const result = await dispatchMilestoneAlert(eventData);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Milestone trigger failed' }, { status: 500 });
  }
}
