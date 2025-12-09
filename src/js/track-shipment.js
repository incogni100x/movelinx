import { supabase } from './client.js';

// Get status icon and color for timeline (matching original track-shipment template)
// All completed statuses use green checkmark, only pending uses gray circle
function getStatusIconAndColor(status, isPending = false) {
  // If status is pending/upcoming, use gray circle
  if (isPending) {
    return {
      svg: '<circle cx="12" cy="12" r="10"></circle>',
      bgColor: 'bg-gray-100',
      iconColor: 'text-gray-400'
    };
  }
  
  // All completed statuses use green checkmark
  const completedIcon = {
    svg: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  };
  
  const icons = {
    'Processing': completedIcon,
    'Picked Up': completedIcon,
    'In Transit': completedIcon,
    'At Destination': completedIcon,
    'Delivered': completedIcon
  };
  
  return icons[status] || completedIcon;
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format package type
function formatPackageType(type) {
  if (!type) return 'N/A';
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format payment status
function formatPaymentStatus(status) {
  if (!status) return 'N/A';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Format clearance status
function formatClearanceStatus(status) {
  if (!status) return 'N/A';
  return status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Calculate progress percentage and completed steps based on status
function getProgressInfo(status) {
  const statusOrder = {
    'Processing': 1,
    'Picked Up': 2,
    'In Transit': 3,
    'At Destination': 4,
    'Delivered': 5
  };
  
  const completedSteps = statusOrder[status] || 0;
  const percentage = Math.round((completedSteps / 5) * 100);
  
  return {
    completedSteps,
    percentage,
    statusOrder
  };
}

// Update progress step icons (checkmark for completed, clock for pending)
function updateProgressSteps(currentStatus) {
  const progressInfo = getProgressInfo(currentStatus);
  const completedSteps = progressInfo.completedSteps;
  
  // Checkmark icon for completed steps
  const checkmarkIcon = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
  // Clock icon for pending steps
  const clockIcon = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
  
  for (let step = 1; step <= 5; step++) {
    const stepElement = document.getElementById(`progress-step-${step}`);
    if (!stepElement) continue;
    
    const svgElement = stepElement.querySelector('svg');
    if (!svgElement) continue;
    
    const isCompleted = step <= completedSteps;
    
    // Update icon
    svgElement.innerHTML = isCompleted ? checkmarkIcon : clockIcon;
    
    // Update color
    if (isCompleted) {
      svgElement.classList.remove('text-gray-400', 'text-primary');
      svgElement.classList.add('text-green-600');
    } else {
      svgElement.classList.remove('text-green-600');
      svgElement.classList.add('text-gray-400');
    }
  }
}

// Fetch shipment by tracking ID
async function fetchShipmentByTrackingId(trackingId) {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('tracking_id', trackingId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return null;
  }
}

// Fetch timeline data
async function fetchTimelineData(shipmentId) {
  try {
    const { data, error } = await supabase
      .from('shipment_timeline')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return [];
  }
}

// Load shipment data into UI
function loadShipmentData(shipment) {
  if (!shipment) return;
  
  // Update tracking ID
  const trackingIdEl = document.getElementById('display-tracking-id');
  if (trackingIdEl) trackingIdEl.textContent = shipment.tracking_id || 'N/A';
  
  // Update From/To locations
  const fromEl = document.getElementById('display-from');
  const toEl = document.getElementById('display-to');
  
  if (fromEl) {
    const fromParts = [shipment.sender_city, shipment.sender_country].filter(Boolean);
    fromEl.textContent = fromParts.length > 0 ? fromParts.join(', ') : 'N/A';
  }
  
  if (toEl) {
    const toParts = [shipment.receiver_city, shipment.receiver_country].filter(Boolean);
    toEl.textContent = toParts.length > 0 ? toParts.join(', ') : 'N/A';
  }
  
  // Update status
  const statusEl = document.getElementById('display-status');
  if (statusEl) statusEl.textContent = shipment.status || 'Processing';
  
  // Update estimated delivery (use updated_at + 3 days as estimate)
  const estimatedDeliveryEl = document.getElementById('display-estimated-delivery');
  if (estimatedDeliveryEl) {
    if (shipment.updated_at) {
      const deliveryDate = new Date(shipment.updated_at);
      deliveryDate.setDate(deliveryDate.getDate() + 3);
      estimatedDeliveryEl.textContent = formatDate(deliveryDate.toISOString());
    } else {
      estimatedDeliveryEl.textContent = 'N/A';
    }
  }
  
  // Update last updated
  const lastUpdatedEl = document.getElementById('display-last-updated');
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = shipment.updated_at ? formatDate(shipment.updated_at) : 'N/A';
  }
  
  // Update package info
  const packageEl = document.getElementById('display-package');
  if (packageEl) {
    const packageType = formatPackageType(shipment.package_type);
    const weight = shipment.weight_kg ? `${shipment.weight_kg}kg` : '';
    packageEl.textContent = packageType && weight ? `${packageType} (${weight})` : packageType || weight || 'N/A';
  }
  
  // Update service (placeholder - not in schema)
  const serviceEl = document.getElementById('display-service');
  if (serviceEl) serviceEl.textContent = 'N/A';
  
  // Update package details
  const packageTypeEl = document.getElementById('display-package-type');
  const weightEl = document.getElementById('display-weight');
  const dimensionsEl = document.getElementById('display-dimensions');
  const declaredValueEl = document.getElementById('display-declared-value');
  
  if (packageTypeEl) packageTypeEl.textContent = formatPackageType(shipment.package_type);
  if (weightEl) weightEl.textContent = shipment.weight_kg ? `${shipment.weight_kg} kg` : 'N/A';
  if (dimensionsEl) {
    const dims = [];
    if (shipment.length_cm) dims.push(`${shipment.length_cm}cm`);
    if (shipment.width_cm) dims.push(`${shipment.width_cm}cm`);
    if (shipment.height_cm) dims.push(`${shipment.height_cm}cm`);
    dimensionsEl.textContent = dims.length > 0 ? dims.join(' × ') : 'N/A';
  }
  if (declaredValueEl) declaredValueEl.textContent = shipment.declared_value_usd ? `$${shipment.declared_value_usd}` : 'N/A';
  
  // Update sender/receiver
  const senderEl = document.getElementById('display-sender');
  const receiverEl = document.getElementById('display-receiver');
  
  if (senderEl) senderEl.textContent = `${shipment.sender_name || 'N/A'} (${shipment.sender_city || 'N/A'})`;
  if (receiverEl) receiverEl.textContent = `${shipment.receiver_name || 'N/A'} (${shipment.receiver_city || 'N/A'})`;
  
  // Update service type (placeholder)
  const serviceTypeEl = document.getElementById('display-service-type');
  if (serviceTypeEl) serviceTypeEl.textContent = 'N/A';
  
  // Update insurance status (placeholder)
  const insuranceStatusEl = document.getElementById('display-insurance-status');
  if (insuranceStatusEl) {
    insuranceStatusEl.textContent = shipment.insurance_yen ? 'Included' : 'N/A';
  }
  
  // Update payment information
  const invoiceNumberEl = document.getElementById('display-invoice-number');
  const paymentStatusEl = document.getElementById('display-payment-status');
  const paymentMethodEl = document.getElementById('display-payment-method');
  const paymentDateEl = document.getElementById('display-payment-date');
  const shippingCostEl = document.getElementById('display-shipping-cost');
  const insuranceEl = document.getElementById('display-insurance');
  const taxesEl = document.getElementById('display-taxes');
  const additionalFeesEl = document.getElementById('display-additional-fees');
  const totalAmountEl = document.getElementById('display-total-amount');
  
  if (invoiceNumberEl) invoiceNumberEl.textContent = shipment.invoice_number || 'N/A';
  if (paymentStatusEl) {
    const status = formatPaymentStatus(shipment.payment_status);
    paymentStatusEl.textContent = status;
    paymentStatusEl.className = shipment.payment_status === 'paid' 
      ? 'text-sm font-semibold text-green-600 text-right' 
      : 'text-sm font-semibold text-primary text-right';
  }
  if (paymentMethodEl) paymentMethodEl.textContent = shipment.payment_method || 'N/A';
  if (paymentDateEl) paymentDateEl.textContent = shipment.payment_date ? formatDate(shipment.payment_date) : 'N/A';
  if (shippingCostEl) shippingCostEl.textContent = shipment.shipping_cost_yen ? `$${shipment.shipping_cost_yen}` : 'N/A';
  if (insuranceEl) insuranceEl.textContent = shipment.insurance_yen ? `$${shipment.insurance_yen}` : 'N/A';
  if (taxesEl) taxesEl.textContent = shipment.taxes_yen ? `$${shipment.taxes_yen}` : 'N/A';
  if (additionalFeesEl) additionalFeesEl.textContent = shipment.additional_fees_usd ? `$${shipment.additional_fees_usd}` : 'N/A';
  if (totalAmountEl) totalAmountEl.textContent = shipment.total_amount_yen ? `$${shipment.total_amount_yen}` : 'N/A';
  
  // Update clearance information
  const clearanceStatusEl = document.getElementById('display-clearance-status');
  const declarationNumberEl = document.getElementById('display-declaration-number');
  const clearanceNotesEl = document.getElementById('display-clearance-notes');
  
  if (clearanceStatusEl) {
    const status = formatClearanceStatus(shipment.clearance_status);
    clearanceStatusEl.textContent = status;
  }
  if (declarationNumberEl) declarationNumberEl.textContent = shipment.declaration_number || 'N/A';
  if (clearanceNotesEl) clearanceNotesEl.textContent = shipment.clearance_notes || 'N/A';
  
  // Update progress bar and steps
  const progressInfo = getProgressInfo(shipment.status);
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-percentage');
  const stepsText = document.getElementById('progress-steps');
  
  if (progressBar) {
    progressBar.style.width = `${progressInfo.percentage}%`;
  }
  if (progressText) {
    progressText.textContent = `${progressInfo.percentage}% Complete`;
  }
  if (stepsText) {
    stepsText.textContent = `${progressInfo.completedSteps} of 5 steps completed`;
  }
  
  // Update progress step icons
  updateProgressSteps(shipment.status);
}

// Get default location and notes for a status
function getDefaultStatusLocationAndNotes(status, shipment) {
  if (!shipment) return { location: 'N/A', notes: '' };
  
  switch (status) {
    case 'Processing':
      return {
        location: shipment.sender_city || 'N/A',
        notes: 'Shipment created and registered in the system'
      };
    case 'Picked Up':
      return {
        location: shipment.sender_city || 'N/A',
        notes: 'Package collected from sender'
      };
    case 'In Transit':
      return {
        location: `En route to ${shipment.receiver_city || 'destination'}`,
        notes: `Package has departed from ${shipment.sender_city || 'origin'} hub and is en route to destination`
      };
    case 'At Destination':
      return {
        location: shipment.receiver_city || 'N/A',
        notes: `Package will arrive at ${shipment.receiver_city || 'destination'} distribution hub`
      };
    case 'Delivered':
      return {
        location: shipment.receiver_street ? `${shipment.receiver_street}, ${shipment.receiver_city}` : (shipment.receiver_city || 'N/A'),
        notes: 'Package will be delivered to recipient\'s address'
      };
    default:
      return { location: 'N/A', notes: '' };
  }
}

// Load timeline data - shows all statuses (completed, current, upcoming)
function loadTimelineData(timelineData, currentStatus, shipment) {
  const timeline = document.getElementById('timeline-list');
  if (!timeline) return;
  
  timeline.innerHTML = '';
  
  // Define all possible statuses in order
  const allStatuses = ['Processing', 'Picked Up', 'In Transit', 'At Destination', 'Delivered'];
  
  // Create a map of status to timeline event data
  const timelineMap = {};
  timelineData.forEach(event => {
    timelineMap[event.status] = event;
  });
  
  // Determine the index of current status
  const currentStatusIndex = allStatuses.indexOf(currentStatus);
  
  // Generate timeline items for all statuses
  allStatuses.forEach((status, index) => {
    const isLast = index === allStatuses.length - 1;
    const isCurrent = status === currentStatus;
    const isCompleted = currentStatusIndex > index;
    const isUpcoming = currentStatusIndex < index;
    
    // Get timeline event data if it exists
    const eventData = timelineMap[status];
    
    // Determine icon and styling
    let iconData;
    let dateText;
    let locationText;
    let notesText;
    
    // Special case: Delivered always uses green checkmark and shows "Current" tag
    if (status === 'Delivered' && isCurrent) {
      iconData = getStatusIconAndColor(status, false);
      dateText = eventData ? formatDate(eventData.created_at) : 'N/A';
      locationText = eventData?.location || getDefaultStatusLocationAndNotes(status, shipment).location;
      notesText = eventData?.notes || getDefaultStatusLocationAndNotes(status, shipment).notes;
    } else if (isCompleted) {
      // Completed status - use green checkmark
      iconData = getStatusIconAndColor(status, false);
      dateText = eventData ? formatDate(eventData.created_at) : 'N/A';
      locationText = eventData?.location || getDefaultStatusLocationAndNotes(status, shipment).location;
      notesText = eventData?.notes || getDefaultStatusLocationAndNotes(status, shipment).notes;
    } else if (isCurrent) {
      // Current status - use clock icon with primary color and "Current" tag
      iconData = {
        svg: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
        bgColor: 'bg-primary/20',
        iconColor: 'text-primary'
      };
      dateText = eventData ? formatDate(eventData.created_at) : `Expected ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      locationText = eventData?.location || getDefaultStatusLocationAndNotes(status, shipment).location;
      notesText = eventData?.notes || getDefaultStatusLocationAndNotes(status, shipment).notes;
    } else {
      // Upcoming/pending status - use clock icon (not gray circle)
      iconData = {
        svg: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
        bgColor: 'bg-gray-100',
        iconColor: 'text-gray-400'
      };
      dateText = 'Pending';
      locationText = getDefaultStatusLocationAndNotes(status, shipment).location;
      notesText = getDefaultStatusLocationAndNotes(status, shipment).notes;
    }
    
    const eventEl = document.createElement('li');
    eventEl.innerHTML = `
      <div class="relative ${isLast ? '' : 'pb-8'}">
        ${!isLast ? '<span class="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>' : ''}
        <div class="relative flex items-start space-x-3">
          <div class="relative">
            <div class="h-10 w-10 rounded-full ${iconData.bgColor} flex items-center justify-center ring-8 ring-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 ${iconData.iconColor}">
                ${iconData.svg}
              </svg>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <div>
              <div class="text-sm">
                <span class="font-medium ${isCurrent ? 'text-primary' : (isUpcoming ? 'text-gray-500' : 'text-gray-900')}">${status}</span>
                ${isCurrent ? '<span class="ml-2 font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full text-xs">Current</span>' : ''}
              </div>
              <p class="mt-0.5 text-sm text-gray-500">${dateText}${locationText !== 'N/A' ? ` • ${locationText}` : ''}</p>
            </div>
            ${notesText ? `<div class="mt-2 text-sm ${isUpcoming ? 'text-gray-500' : 'text-gray-700'} max-w-md break-words overflow-wrap-anywhere"><p>${notesText}</p></div>` : ''}
          </div>
        </div>
      </div>
    `;
    
    timeline.appendChild(eventEl);
  });
}

// Function to perform tracking search
async function performTrackingSearch(trackingNumber) {
  const trackButton = document.getElementById('trackButton');
  const trackingInput = document.getElementById('trackingInput');
  const trackingResults = document.getElementById('trackingResults');
  const errorState = document.getElementById('errorState');
  
  if (!trackingNumber || !trackingNumber.trim()) {
    if (trackingInput) {
      alert('Please enter a tracking number');
      trackingInput.focus();
    }
    return;
  }
  
  // Set input value
  if (trackingInput) {
    trackingInput.value = trackingNumber.trim();
  }
  
  // Show loading state
  if (trackButton) {
    trackButton.disabled = true;
    const originalHTML = trackButton.innerHTML;
    trackButton.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Tracking...
    `;
    
    try {
      // Fetch shipment by tracking ID
      const shipment = await fetchShipmentByTrackingId(trackingNumber.trim());
      
      if (!shipment) {
        // Show error state
        trackingResults.classList.add('hidden');
        errorState.classList.remove('hidden');
      } else {
        // Hide error state
        errorState.classList.add('hidden');
        trackingResults.classList.remove('hidden');
        
        // Load shipment data
        loadShipmentData(shipment);
        
        // Fetch and load timeline
        const timelineData = await fetchTimelineData(shipment.id);
        loadTimelineData(timelineData, shipment.status, shipment);
      }
    } catch (error) {
      console.error('Error tracking shipment:', error);
      trackingResults.classList.add('hidden');
      errorState.classList.remove('hidden');
    } finally {
      // Reset button
      trackButton.disabled = false;
      trackButton.innerHTML = originalHTML;
    }
  }
}

// Initialize tracking
document.addEventListener('DOMContentLoaded', function() {
  const trackButton = document.getElementById('trackButton');
  const trackingInput = document.getElementById('trackingInput');
  const trackingResults = document.getElementById('trackingResults');
  const errorState = document.getElementById('errorState');
  
  // Check for tracking ID in URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const trackingIdFromUrl = urlParams.get('tracking');
  
  if (trackingIdFromUrl) {
    // Auto-search if tracking ID is in URL
    performTrackingSearch(trackingIdFromUrl);
  } else {
    // Remove default value if no tracking ID in URL
    if (trackingInput) {
      trackingInput.value = '';
    }
  }
  
  trackButton.addEventListener('click', async function() {
    const trackingNumber = trackingInput.value.trim();
    await performTrackingSearch(trackingNumber);
  });
  
  // Allow Enter key to trigger tracking
  if (trackingInput) {
    trackingInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        trackButton.click();
      }
    });
  }
});

