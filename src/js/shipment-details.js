import { requireAdminAuth } from './session.js';
import { handleLogout } from './logout.js';
import { supabase } from './client.js';

// Get status class and icon based on status
function getStatusClass(status) {
  if (status === 'Delivered') {
    return 'bg-green-100 text-green-800';
  } else if (status === 'In Transit') {
    return 'bg-blue-100 text-blue-800';
  } else if (status === 'Processing') {
    return 'bg-yellow-100 text-yellow-800';
  } else if (status === 'At Destination') {
    return 'bg-purple-100 text-purple-800';
  } else if (status === 'Picked Up') {
    return 'bg-indigo-100 text-indigo-800';
  } else {
    return 'bg-gray-100 text-gray-800';
  }
}

function getStatusIcon(status) {
  if (status === 'Delivered') {
    return { svg: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>', color: 'bg-green-500' };
  } else if (status === 'In Transit') {
    return { svg: '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>', color: 'bg-blue-500' };
  } else if (status === 'Processing') {
    return { svg: '<circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path>', color: 'bg-yellow-500' };
  } else if (status === 'Picked Up') {
    return { svg: '<path d="M5 12h14"></path><path d="M12 5v14"></path>', color: 'bg-indigo-500' };
  } else if (status === 'At Destination') {
    return { svg: '<circle cx="12" cy="12" r="10"></circle><path d="M8 12h.01"></path><path d="M12 12h.01"></path><path d="M16 12h.01"></path>', color: 'bg-purple-500' };
  } else {
    return { svg: '<circle cx="12" cy="12" r="10"></circle>', color: 'bg-gray-500' };
  }
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format package type for display
function formatPackageType(type) {
  if (!type) return 'N/A';
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format payment status for display
function formatPaymentStatus(status) {
  if (!status) return 'N/A';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Format clearance status for display
function formatClearanceStatus(status) {
  if (!status) return 'N/A';
  return status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Fetch shipment data from database
async function fetchShipmentData(shipmentId) {
  try {
    // Try to fetch by UUID first
    let { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single();
    
    // If not found by UUID, try by tracking_id
    if (error || !data) {
      const { data: trackingData, error: trackingError } = await supabase
        .from('shipments')
        .select('*')
        .eq('tracking_id', shipmentId)
        .single();
      
      if (trackingError) {
        throw trackingError;
      }
      data = trackingData;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching shipment:', error);
    throw error;
  }
}

// Fetch timeline data from database
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

// Load shipment data into the UI
function loadShipmentData(shipment) {
  if (!shipment) return;
  
  // Update tracking ID
  const trackingIdEl = document.getElementById('tracking-id');
  const modalTrackingIdEl = document.getElementById('modal-tracking-id');
  
  if (trackingIdEl) {
    trackingIdEl.textContent = `Tracking ID: ${shipment.tracking_id || shipment.id}`;
  }
  
  if (modalTrackingIdEl) {
    modalTrackingIdEl.textContent = shipment.tracking_id || shipment.id;
  }
  
  // Update status
  const currentStatus = document.getElementById('current-status');
  if (currentStatus) {
    currentStatus.textContent = shipment.status || 'Processing';
    currentStatus.className = `px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(shipment.status || 'Processing')}`;
  }
  
  // Update timestamps
  const lastUpdatedEl = document.getElementById('last-updated');
  const createdOnEl = document.getElementById('created-on');
  
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = formatDate(shipment.updated_at);
  }
  
  if (createdOnEl) {
    createdOnEl.textContent = formatDate(shipment.created_at);
  }
  
  // Update package details
  const packageTypeEl = document.getElementById('package-type');
  const packageWeightEl = document.getElementById('package-weight');
  const packageDimensionsEl = document.getElementById('package-dimensions');
  const packageValueEl = document.getElementById('package-value');
  
  if (packageTypeEl) {
    packageTypeEl.textContent = formatPackageType(shipment.package_type);
  }
  
  if (packageWeightEl) {
    packageWeightEl.textContent = shipment.weight_kg ? `${shipment.weight_kg} kg` : 'N/A';
  }
  
  if (packageDimensionsEl) {
    const dims = [];
    if (shipment.length_cm) dims.push(`${shipment.length_cm}cm`);
    if (shipment.width_cm) dims.push(`${shipment.width_cm}cm`);
    if (shipment.height_cm) dims.push(`${shipment.height_cm}cm`);
    packageDimensionsEl.textContent = dims.length > 0 ? dims.join(' x ') : 'N/A';
  }
  
  if (packageValueEl) {
    packageValueEl.textContent = shipment.declared_value_usd ? `$${shipment.declared_value_usd}` : 'N/A';
  }
  
  // Update sender information
  const senderNameEl = document.getElementById('sender-name');
  const senderPhoneEl = document.getElementById('sender-phone');
  const senderEmailEl = document.getElementById('sender-email');
  const senderAddressEl = document.getElementById('sender-address');
  
  if (senderNameEl) senderNameEl.textContent = shipment.sender_name || 'N/A';
  if (senderPhoneEl) senderPhoneEl.textContent = shipment.sender_phone || 'N/A';
  if (senderEmailEl) senderEmailEl.textContent = shipment.sender_email || 'N/A';
  if (senderAddressEl) {
    const addressParts = [
      shipment.sender_street,
      shipment.sender_city,
      shipment.sender_country
    ].filter(Boolean);
    senderAddressEl.innerHTML = addressParts.join('<br>') || 'N/A';
  }
  
  // Update receiver information
  const receiverNameEl = document.getElementById('receiver-name');
  const receiverPhoneEl = document.getElementById('receiver-phone');
  const receiverAddressEl = document.getElementById('receiver-address');
  
  if (receiverNameEl) receiverNameEl.textContent = shipment.receiver_name || 'N/A';
  if (receiverPhoneEl) receiverPhoneEl.textContent = shipment.receiver_phone || 'N/A';
  if (receiverAddressEl) {
    const addressParts = [
      shipment.receiver_street,
      shipment.receiver_city,
      shipment.receiver_country
    ].filter(Boolean);
    receiverAddressEl.innerHTML = addressParts.join('<br>') || 'N/A';
  }
  
  // Update payment information
  const invoiceNumberEl = document.getElementById('payment-invoice-number');
  const paymentStatusEl = document.getElementById('payment-status-display');
  const paymentMethodEl = document.getElementById('payment-method-display');
  const paymentDateEl = document.getElementById('payment-date-display');
  const shippingCostEl = document.getElementById('payment-shipping-cost');
  const insuranceEl = document.getElementById('payment-insurance');
  const taxesEl = document.getElementById('payment-taxes');
  const additionalFeesEl = document.getElementById('payment-additional-fees');
  const totalAmountEl = document.getElementById('payment-total-amount');
  
  if (invoiceNumberEl) invoiceNumberEl.textContent = shipment.invoice_number || 'N/A';
  if (paymentStatusEl) paymentStatusEl.textContent = formatPaymentStatus(shipment.payment_status);
  if (paymentMethodEl) paymentMethodEl.textContent = shipment.payment_method || 'N/A';
  if (paymentDateEl) paymentDateEl.textContent = shipment.payment_date ? formatDate(shipment.payment_date) : 'N/A';
  if (shippingCostEl) shippingCostEl.textContent = shipment.shipping_cost_yen ? `¥${shipment.shipping_cost_yen}` : 'N/A';
  if (insuranceEl) insuranceEl.textContent = shipment.insurance_yen ? `¥${shipment.insurance_yen}` : 'N/A';
  if (taxesEl) taxesEl.textContent = shipment.taxes_yen ? `¥${shipment.taxes_yen}` : 'N/A';
  if (additionalFeesEl) additionalFeesEl.textContent = shipment.additional_fees_usd ? `$${shipment.additional_fees_usd}` : 'N/A';
  if (totalAmountEl) totalAmountEl.textContent = shipment.total_amount_yen ? `¥${shipment.total_amount_yen}` : 'N/A';
  
  // Update clearance information
  const clearanceStatusEl = document.getElementById('clearance-status-display');
  const declarationNumberEl = document.getElementById('clearance-declaration-number');
  const clearanceNotesEl = document.getElementById('clearance-notes-display');
  
  if (clearanceStatusEl) clearanceStatusEl.textContent = formatClearanceStatus(shipment.clearance_status);
  if (declarationNumberEl) declarationNumberEl.textContent = shipment.declaration_number || 'N/A';
  if (clearanceNotesEl) clearanceNotesEl.textContent = shipment.clearance_notes || 'N/A';
}

// Load timeline data into the UI
function loadTimelineData(timelineData) {
  const timeline = document.getElementById('timeline-events');
  if (!timeline) return;
  
  timeline.innerHTML = '';
  
  if (timelineData.length === 0) {
    timeline.innerHTML = '<li class="text-sm text-gray-500">No timeline events yet.</li>';
    return;
  }
  
  timelineData.forEach((event, index) => {
    const isLast = index === timelineData.length - 1;
    const icon = getStatusIcon(event.status);
    const formattedDate = formatDate(event.created_at);
    
    const eventEl = document.createElement('li');
    eventEl.innerHTML = `
      <div class="relative ${isLast ? '' : 'pb-8'}">
        ${!isLast ? '<span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>' : ''}
        <div class="relative flex space-x-3">
          <div>
            <span class="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${icon.color}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-white">
                ${icon.svg}
              </svg>
            </span>
          </div>
          <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
            <div>
              <p class="text-sm text-gray-900 font-medium">${event.status}</p>
              ${event.location ? `<p class="text-sm text-gray-500">${event.location}</p>` : ''}
              ${event.notes ? `<p class="mt-1 text-sm text-gray-500">${event.notes}</p>` : ''}
            </div>
            <div class="text-right text-sm whitespace-nowrap text-gray-500">
              ${formattedDate}
            </div>
          </div>
        </div>
      </div>
    `;
    
    timeline.appendChild(eventEl);
  });
}

// Store current shipment data for modal population
let currentShipmentData = null;

// Get default location and notes for status based on shipment data
function getDefaultStatusLocationAndNotes(status, shipment) {
  if (!shipment) {
    return { location: null, notes: null };
  }
  
  // Build receiver full address for Delivered status
  const receiverAddressParts = [
    shipment.receiver_street,
    shipment.receiver_city,
    shipment.receiver_country
  ].filter(Boolean);
  const receiverFullAddress = receiverAddressParts.length > 0 
    ? receiverAddressParts.join(', ') 
    : (shipment.receiver_city || 'Destination');
  
  const defaults = {
    'Processing': {
      location: `${shipment.sender_city || 'Origin'} Sorting Center`,
      notes: 'Shipment created and processed'
    },
    'Picked Up': {
      location: `${shipment.sender_city || 'Origin'} Sorting Center`,
      notes: 'Package picked up by courier'
    },
    'In Transit': {
      location: `${shipment.receiver_city || 'Destination'} Distribution Hub`,
      notes: 'Package in transit to destination'
    },
    'At Destination': {
      location: `${shipment.receiver_city || 'Destination'} Distribution Hub`,
      notes: `Package in ${shipment.receiver_city || 'Destination'} Distribution Hub`
    },
    'Delivered': {
      location: receiverFullAddress,
      notes: 'Package picked up by receiver'
    }
  };
  
  return defaults[status] || { location: null, notes: null };
}

// Populate update modal with current shipment data
function populateUpdateModal(shipment) {
  if (!shipment) return;
  
  // Status fields
  const statusSelect = document.getElementById('status');
  if (statusSelect && shipment.status) {
    statusSelect.value = shipment.status;
  }
  
  // Payment fields
  const invoiceNumber = document.getElementById('update-invoice-number');
  const paymentStatus = document.getElementById('update-payment-status');
  const paymentMethod = document.getElementById('update-payment-method');
  const paymentDate = document.getElementById('update-payment-date');
  const shippingCost = document.getElementById('update-shipping-cost');
  const insurance = document.getElementById('update-insurance');
  const taxes = document.getElementById('update-taxes');
  const additionalFees = document.getElementById('update-additional-fees');
  const totalAmount = document.getElementById('update-total-amount');
  
  if (invoiceNumber) invoiceNumber.value = shipment.invoice_number || '';
  if (paymentStatus) paymentStatus.value = shipment.payment_status || '';
  if (paymentMethod) paymentMethod.value = shipment.payment_method || '';
  if (paymentDate) paymentDate.value = shipment.payment_date || '';
  if (shippingCost) shippingCost.value = shipment.shipping_cost_yen || '';
  if (insurance) insurance.value = shipment.insurance_yen || '';
  if (taxes) taxes.value = shipment.taxes_yen || '';
  if (additionalFees) additionalFees.value = shipment.additional_fees_usd || '';
  if (totalAmount) totalAmount.value = shipment.total_amount_yen || '';
  
  // Clearance fields
  const clearanceStatus = document.getElementById('update-clearance-status');
  const declarationNumber = document.getElementById('update-declaration-number');
  const clearanceNotes = document.getElementById('update-clearance-notes');
  
  if (clearanceStatus) clearanceStatus.value = shipment.clearance_status || '';
  if (declarationNumber) declarationNumber.value = shipment.declaration_number || '';
  if (clearanceNotes) clearanceNotes.value = shipment.clearance_notes || '';
}

// Update shipment in database
async function updateShipment(shipmentId, updateData, currentStatus = null, shipmentData = null) {
  try {
    // Separate shipment data from timeline data
    const { location, notes, ...shipmentUpdateData } = updateData;
    
    // Check if status is actually changing
    const statusChanged = updateData.status && currentStatus && updateData.status !== currentStatus;
    
    // Update shipment (excluding location and notes which are timeline-only fields)
    const { error: updateError } = await supabase
      .from('shipments')
      .update(shipmentUpdateData)
      .eq('id', shipmentId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Handle timeline entry for status changes
    if (statusChanged || (updateData.status && !currentStatus)) {
      // Get default location and notes if not provided
      const defaults = getDefaultStatusLocationAndNotes(updateData.status, shipmentData || currentShipmentData);
      const finalLocation = location || defaults.location;
      const finalNotes = notes || defaults.notes;
      
      // Check if this status already exists in timeline (rollback scenario)
      const { data: existingTimeline, error: fetchError } = await supabase
        .from('shipment_timeline')
        .select('id, status, created_at')
        .eq('shipment_id', shipmentId)
        .eq('status', updateData.status)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected if status doesn't exist
        console.error('Error checking timeline:', fetchError);
      }
      
      if (existingTimeline) {
        // Status exists in timeline - this is a rollback, UPDATE the existing entry
        const updateFields = {};
        if (finalLocation) updateFields.location = finalLocation;
        if (finalNotes) updateFields.notes = finalNotes;
        
        if (Object.keys(updateFields).length > 0) {
          const { error: updateTimelineError } = await supabase
            .from('shipment_timeline')
            .update(updateFields)
            .eq('id', existingTimeline.id);
          
          if (updateTimelineError) {
            console.error('Timeline update error (non-critical):', updateTimelineError);
          }
        }
      } else {
        // Status doesn't exist in timeline - this is forward progression, CREATE new entry
        const { error: timelineError } = await supabase
          .from('shipment_timeline')
          .insert([{
            shipment_id: shipmentId,
            status: updateData.status,
            location: finalLocation || null,
            notes: finalNotes || null
          }]);
        
        if (timelineError) {
          console.error('Timeline error (non-critical):', timelineError);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating shipment:', error);
    throw error;
  }
}

// Function to handle shipment update
async function handleShipmentUpdate(shipmentId, formData) {
  try {
    // Get current shipment status for comparison
    const currentShipment = currentShipmentData || await fetchShipmentData(shipmentId);
    const currentStatus = currentShipment ? currentShipment.status : null;
    
    // Prepare update data
    const updateData = {
      status: formData.status,
      invoice_number: formData.invoice_number || null,
      payment_status: formData.payment_status || null,
      payment_method: formData.payment_method || null,
      payment_date: formData.payment_date || null,
      shipping_cost_yen: formData.shipping_cost_yen ? parseFloat(formData.shipping_cost_yen) : null,
      insurance_yen: formData.insurance_yen ? parseFloat(formData.insurance_yen) : null,
      taxes_yen: formData.taxes_yen ? parseFloat(formData.taxes_yen) : null,
      additional_fees_usd: formData.additional_fees_usd ? parseFloat(formData.additional_fees_usd) : null,
      total_amount_yen: formData.total_amount_yen ? parseFloat(formData.total_amount_yen) : null,
      clearance_status: formData.clearance_status || null,
      declaration_number: formData.declaration_number || null,
      clearance_notes: formData.clearance_notes || null,
    };
    
    // Add location and notes for timeline if status is being updated
    if (formData.status) {
      updateData.location = formData.location || null;
      updateData.notes = formData.notes || null;
    }
    
    // Update in database (pass current status and shipment data for defaults)
    await updateShipment(shipmentId, updateData, currentStatus, currentShipment);
    
    // Reload shipment data
    const shipment = await fetchShipmentData(shipmentId);
    if (shipment) {
      loadShipmentData(shipment);
      currentShipmentData = shipment;
    }
    
    // Update current status in UI if changed
    if (formData.status) {
      const currentStatus = document.getElementById('current-status');
      if (currentStatus) {
        currentStatus.textContent = formData.status;
        currentStatus.className = `px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(formData.status)}`;
      }
      
      // Update last updated timestamp
      const lastUpdatedEl = document.getElementById('last-updated');
      if (lastUpdatedEl) {
        lastUpdatedEl.textContent = formatDate(new Date().toISOString());
      }
      
      // Reload timeline
      const timelineData = await fetchTimelineData(shipmentId);
      loadTimelineData(timelineData);
    }
    
    return true;
  } catch (error) {
    console.error('Error handling shipment update:', error);
    throw error;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Mobile sidebar toggle
  const openSidebarBtn = document.getElementById('open-sidebar-button');
  const closeSidebarBtn = document.getElementById('close-sidebar-button');
  const sidebarBackdrop = document.getElementById('mobile-sidebar-backdrop');
  const mobileSidebar = document.getElementById('mobile-sidebar');
  
  if (openSidebarBtn && mobileSidebar) {
    openSidebarBtn.addEventListener('click', function() {
      mobileSidebar.classList.remove('hidden');
    });
  }

  if (closeSidebarBtn && mobileSidebar) {
    closeSidebarBtn.addEventListener('click', function() {
      mobileSidebar.classList.add('hidden');
    });
  }

  if (sidebarBackdrop && mobileSidebar) {
    sidebarBackdrop.addEventListener('click', function() {
      mobileSidebar.classList.add('hidden');
    });
  }

  // Logout functionality
  const logoutButtons = [
    document.getElementById('mobile-logout-button'),
    document.getElementById('desktop-logout-button')
  ];

  logoutButtons.forEach(button => {
    if (button) {
      button.addEventListener('click', async function() {
        await handleLogout();
      });
    }
  });
  
  // Modal functionality
  const updateStatusBtn = document.getElementById('update-status-button');
  const cancelUpdateBtn = document.getElementById('cancel-update');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const updateModal = document.getElementById('update-modal');
  const submitUpdateBtn = document.getElementById('submit-update');
  
  if (updateStatusBtn && updateModal) {
    updateStatusBtn.addEventListener('click', function() {
      // Populate modal with current shipment data
      if (currentShipmentData) {
        populateUpdateModal(currentShipmentData);
      }
      
      // Clear location and notes inputs (these are for timeline, not existing data)
      const locationInput = document.getElementById('location');
      const notesInput = document.getElementById('notes');
      
      if (locationInput) locationInput.value = '';
      if (notesInput) notesInput.value = '';
      
      // Open modal
      updateModal.classList.remove('hidden');
    });
  }
  
  if (cancelUpdateBtn && updateModal) {
    cancelUpdateBtn.addEventListener('click', function() {
      updateModal.classList.add('hidden');
    });
  }
  
  if (modalBackdrop && updateModal) {
    modalBackdrop.addEventListener('click', function() {
      updateModal.classList.add('hidden');
    });
  }
  
  if (submitUpdateBtn) {
    submitUpdateBtn.addEventListener('click', async function() {
      // Get all form values
      const statusSelect = document.getElementById('status');
      const locationInput = document.getElementById('location');
      const notesInput = document.getElementById('notes');
      
      // Payment fields
      const invoiceNumber = document.getElementById('update-invoice-number');
      const paymentStatus = document.getElementById('update-payment-status');
      const paymentMethod = document.getElementById('update-payment-method');
      const paymentDate = document.getElementById('update-payment-date');
      const shippingCost = document.getElementById('update-shipping-cost');
      const insurance = document.getElementById('update-insurance');
      const taxes = document.getElementById('update-taxes');
      const additionalFees = document.getElementById('update-additional-fees');
      const totalAmount = document.getElementById('update-total-amount');
      
      // Clearance fields
      const clearanceStatus = document.getElementById('update-clearance-status');
      const declarationNumber = document.getElementById('update-declaration-number');
      const clearanceNotes = document.getElementById('update-clearance-notes');
      
      if (!statusSelect) return;
      
      // Collect form data
      const formData = {
        status: statusSelect.value,
        location: locationInput ? locationInput.value.trim() : '',
        notes: notesInput ? notesInput.value.trim() : '',
        invoice_number: invoiceNumber ? invoiceNumber.value.trim() : '',
        payment_status: paymentStatus ? paymentStatus.value : '',
        payment_method: paymentMethod ? paymentMethod.value.trim() : '',
        payment_date: paymentDate ? paymentDate.value : '',
        shipping_cost_yen: shippingCost ? shippingCost.value : '',
        insurance_yen: insurance ? insurance.value : '',
        taxes_yen: taxes ? taxes.value : '',
        additional_fees_usd: additionalFees ? additionalFees.value : '',
        total_amount_yen: totalAmount ? totalAmount.value : '',
        clearance_status: clearanceStatus ? clearanceStatus.value : '',
        declaration_number: declarationNumber ? declarationNumber.value.trim() : '',
        clearance_notes: clearanceNotes ? clearanceNotes.value.trim() : '',
      };
      
      // Disable button and show loading
      submitUpdateBtn.disabled = true;
      const originalText = submitUpdateBtn.textContent;
      submitUpdateBtn.textContent = 'Updating...';
      
      try {
        // Get shipment ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const shipmentId = urlParams.get('id');
        
        if (!shipmentId) {
          throw new Error('Shipment ID not found');
        }
        
        // Update shipment
        await handleShipmentUpdate(shipmentId, formData);
        
        // Reset location and notes (timeline fields)
        if (locationInput) locationInput.value = '';
        if (notesInput) notesInput.value = '';
        
        // Close modal
        if (updateModal) {
          updateModal.classList.add('hidden');
        }
      } catch (error) {
        console.error('Error updating shipment:', error);
        alert('Failed to update shipment. Please try again.');
      } finally {
        // Reset button
        submitUpdateBtn.disabled = false;
        submitUpdateBtn.textContent = originalText;
      }
    });
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
  // Require authentication - will redirect if not authenticated
  await requireAdminAuth({ redirectTo: '/admin-login' });
  
  // Get shipment ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const shipmentId = urlParams.get('id');
  
  if (!shipmentId) {
    alert('Shipment ID not found');
    window.location.href = '/admin/shipments';
    return;
  }
  
  try {
    // Fetch shipment data
    const shipment = await fetchShipmentData(shipmentId);
    
    if (!shipment) {
      alert('Shipment not found');
      window.location.href = '/admin/shipments';
      return;
    }
    
    // Store shipment data for modal population
    currentShipmentData = shipment;
    
    // Load shipment data into UI
    loadShipmentData(shipment);
    
    // Fetch and load timeline data
    const timelineData = await fetchTimelineData(shipment.id);
    loadTimelineData(timelineData);
    
    // Update modal tracking ID display
    const modalTrackingIdEl = document.getElementById('modal-tracking-id');
    if (modalTrackingIdEl) {
      modalTrackingIdEl.textContent = shipment.tracking_id || shipment.id;
    }
  } catch (error) {
    console.error('Error loading shipment:', error);
    alert('Failed to load shipment data');
    window.location.href = '/admin/shipments';
  }
  
  // Set up event listeners
  setupEventListeners();
});

