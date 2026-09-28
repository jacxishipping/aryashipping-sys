'use client';

import { useState } from 'react';
import {
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Box,
	Checkbox,
	FormControlLabel,
} from '@mui/material';
import { MapPin } from 'lucide-react';
import { Button, Modal, toast } from '@/components/design-system';

interface AddTrackingEventModalProps {
	open: boolean;
	onClose: () => void;
	containerId: string;
	onSuccess: () => void;
}

const trackingStatuses = [
	{ value: 'Container Booked', label: '📋 Container Booked' },
	{ value: 'Empty Container Pickup', label: '📦 Empty Container Pickup' },
	{ value: 'Loaded at Origin', label: '🏭 Loaded at Origin' },
	{ value: 'Departed Origin Port', label: '🚢 Departed Origin Port' },
	{ value: 'In Transit - Ocean', label: '🌊 In Transit - Ocean' },
	{ value: 'Transshipment', label: '🔄 Transshipment' },
	{ value: 'Arrived at Destination Port', label: '⚓ Arrived at Destination Port' },
	{ value: 'Customs Clearance', label: '🛂 Customs Clearance' },
	{ value: 'Released from Customs', label: '✅ Released from Customs' },
	{ value: 'Out for Delivery', label: '🚚 Out for Delivery' },
	{ value: 'Delivered', label: '🎯 Delivered' },
	{ value: 'Empty Container Return', label: '♻️ Empty Container Return' },
	{ value: 'Delay', label: '⏰ Delay' },
	{ value: 'On Hold', label: '⚠️ On Hold' },
	{ value: 'Issue/Problem', label: '🚨 Issue/Problem' },
];

const sourceOptions = [
	{ value: 'Manual', label: 'Manual Entry' },
	{ value: 'API', label: 'API/System' },
	{ value: 'Carrier', label: 'Carrier Update' },
	{ value: 'Port', label: 'Port Authority' },
	{ value: 'Customs', label: 'Customs' },
];

export default function AddTrackingEventModal({
	open,
	onClose,
	containerId,
	onSuccess,
}: AddTrackingEventModalProps) {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		status: 'In Transit - Ocean',
		location: '',
		vesselName: '',
		description: '',
		eventDate: new Date().toISOString().slice(0, 16), // datetime-local format
		source: 'Manual',
		completed: false,
		latitude: '',
		longitude: '',
	});

	const handleChange = (field: string, value: string | boolean) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!formData.status.trim()) {
			toast.error('Please select a status');
			return;
		}

		if (!formData.eventDate) {
			toast.error('Please select an event date');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch(`/api/containers/${containerId}/tracking`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: formData.status,
					location: formData.location || undefined,
					vesselName: formData.vesselName || undefined,
					description: formData.description || undefined,
					eventDate: formData.eventDate,
					source: formData.source,
					completed: formData.completed,
					latitude: formData.latitude || undefined,
					longitude: formData.longitude || undefined,
				}),
			});

			if (response.ok) {
				toast.success('Tracking event added successfully');
				onSuccess();
				handleClose();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to add tracking event');
			}
		} catch (error) {
			console.error('Error adding tracking event:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (!loading) {
			setFormData({
				status: 'In Transit - Ocean',
				location: '',
				vesselName: '',
				description: '',
				eventDate: new Date().toISOString().slice(0, 16),
				source: 'Manual',
				completed: false,
				latitude: '',
				longitude: '',
			});
			onClose();
		}
	};

	const formId = 'container-tracking-event-form';

	return (
		<Modal
			open={open}
			onClose={handleClose}
			size="lg"
			title={
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<MapPin style={{ fontSize: 24, color: 'var(--accent-gold)' }} />
					<span>Add Tracking Event</span>
				</Box>
			}
			description="Record a container milestone, update the source, and add coordinates when location precision matters."
			showCloseButton={!loading}
			disableBackdropClick={loading}
			actions={
				<>
					<Button variant="outline" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button type="submit" form={formId} variant="primary" disabled={loading}>
						{loading ? 'Adding...' : 'Add Tracking Event'}
					</Button>
				</>
			}
		>
			<Box component="form" id={formId} onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
					<FormControl fullWidth size="small" required>
						<InputLabel>Status/Event Type</InputLabel>
						<Select
							value={formData.status}
							onChange={(e) => handleChange('status', e.target.value)}
							label="Status/Event Type"
						>
							{trackingStatuses.map((status) => (
								<MenuItem key={status.value} value={status.value}>
									{status.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<TextField
						size="small"
						label="Location"
						value={formData.location}
						onChange={(e) => handleChange('location', e.target.value)}
						placeholder="e.g., Port of Los Angeles, CA, USA"
						helperText="City, port, or facility name"
					/>

					<TextField
						size="small"
						label="Vessel Name"
						value={formData.vesselName}
						onChange={(e) => handleChange('vesselName', e.target.value)}
						placeholder="e.g., MSC GULSUN, EVER GIVEN"
						helperText="Ship or carrier name (optional)"
					/>

					<TextField
						size="small"
						label="Event Date & Time"
						type="datetime-local"
						value={formData.eventDate}
						onChange={(e) => handleChange('eventDate', e.target.value)}
						required
						InputLabelProps={{ shrink: true }}
					/>

					<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
						<FormControl fullWidth size="small">
							<InputLabel>Source</InputLabel>
							<Select
								value={formData.source}
								onChange={(e) => handleChange('source', e.target.value)}
								label="Source"
							>
								{sourceOptions.map((source) => (
									<MenuItem key={source.value} value={source.value}>
										{source.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<FormControlLabel
							control={
								<Checkbox
									checked={formData.completed}
									onChange={(e) => handleChange('completed', e.target.checked)}
									size="small"
								/>
							}
							label="Mark as Completed"
							sx={{ mt: 1 }}
						/>
					</Box>

					<TextField
						size="small"
						label="Description"
						value={formData.description}
						onChange={(e) => handleChange('description', e.target.value)}
						multiline
						rows={3}
						placeholder="Additional details about this event..."
					/>

					<Box 
						sx={{ 
							border: '1px solid var(--border)', 
							borderRadius: 1, 
							p: 2, 
							bgcolor: 'var(--surface)' 
						}}
					>
						<Box sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1.5 }}>
							GPS Coordinates (Optional)
						</Box>
						<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
							<TextField
								size="small"
								label="Latitude"
								type="number"
								value={formData.latitude}
								onChange={(e) => handleChange('latitude', e.target.value)}
								placeholder="e.g., 33.7701"
								inputProps={{ step: 'any' }}
							/>
							<TextField
								size="small"
								label="Longitude"
								type="number"
								value={formData.longitude}
								onChange={(e) => handleChange('longitude', e.target.value)}
								placeholder="e.g., -118.1937"
								inputProps={{ step: 'any' }}
							/>
						</Box>
					</Box>
			</Box>
		</Modal>
	);
}
