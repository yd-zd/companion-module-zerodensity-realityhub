# Rundown Item Status API - Companion Module Implementation Guide

**Date:** January 5, 2026  
**API Version:** Reality Hub REST API v1  
**Module Version:** 2.1.10+ (Planned)

---

## Table of Contents

1. [Overview](#overview)
2. [API Details](#api-details)
3. [Implementation Strategy](#implementation-strategy)
4. [Code Changes](#code-changes)
5. [Feedbacks](#feedbacks)
6. [Actions](#actions)
7. [Presets](#presets)
8. [Testing](#testing)
9. [Performance Considerations](#performance-considerations)
10. [Backward Compatibility](#backward-compatibility)

---

## Overview

Reality Hub API now returns real-time status information for rundown items, including whether items are playing in Program, Preview, or are idle. This enables the Companion module to provide visual feedback and smart controls that prevent operator errors.

### Benefits

1. **Visual Feedback**: Operators can see which items are currently playing
2. **Prevent Errors**: Disable play buttons for already-playing items
3. **Multi-Operator Support**: Status syncs across multiple control surfaces
4. **Professional UI**: Match Reality Hub's native control interface

### Key Use Cases

- **Pre-visualization**: See which graphics are on-air before pressing buttons
- **Conflict Prevention**: Avoid playing an item that's already playing
- **Status Monitoring**: Monitor rundown state from Companion Stream Deck
- **Smart Automation**: Create macros that check status before executing

---

## API Details

### Endpoint

```
GET /api/rest/v1/lino/rundown/{engineId}/{rundownId}/items
```

### Response Schema

Each item now includes a `status` object:

```json
{
  "id": 128,
  "itemNo": 4,
  "name": "News_LT_Logo",
  "template": "News_LT_Logo",
  "templateId": 5,
  "buttons": {},
  "data": {},
  "status": {
    "preview": "Available | Playing | Unavailable",
    "program": "Available | Playing | Unavailable",
    "isActive": true,
    "activeIn": ["preview", "program"],
    "online": true
  }
}
```

### Status Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `status.preview` | String | Preview channel state: "Available", "Playing", or "Unavailable" |
| `status.program` | String | Program channel state: "Available", "Playing", or "Unavailable" |
| `status.isActive` | Boolean | `true` if item is active in any channel |
| `status.activeIn` | Array | List of channels where item is active: `["preview"]`, `["program"]`, or `["preview", "program"]` |
| `status.online` | Boolean | Whether the item is online (loaded and ready) on any engine host |

### Status Values

- **Available**: Channel is ready, item can be played
- **Playing**: Item is currently playing/on-air on this channel
- **Unavailable**: Item cannot be played (not loaded on engine or engine offline)

---

## Implementation Strategy

### Phase 1: Data Collection (Minimal Changes)

1. Modify `features/rundowns.js` to store status in item cache
2. No UI changes, just data collection
3. Add logging to verify status values

### Phase 2: Feedback Implementation

1. Create new feedback types for status visualization
2. Add feedbacks to existing rundown presets
3. Test with various item states

### Phase 3: Smart Actions (Optional)

1. Add action options to check status before execution
2. Implement "play only if not playing" logic
3. Add error messages when preconditions fail

### Phase 4: Status Polling (Advanced)

1. Implement background polling for status updates
2. Update button states in real-time
3. Add configurable poll interval

---

## Code Changes

### 1. Update Rundown Data Model (`features/rundowns.js`)

#### Current Implementation

```javascript
// features/rundowns.js
async function fetchRundownItems(inst, rundownId) {
    const items = await inst.api.lino.listItems(engineId, rundownId);
    // Store items...
}
```

#### Enhanced Implementation

```javascript
// features/rundowns.js

/**
 * Fetch rundown items with status information
 * @param {Object} inst - Module instance
 * @param {number} engineId - Show/Engine ID
 * @param {number} rundownId - Rundown ID
 * @returns {Promise<Array>} Items with status
 */
async function fetchRundownItems(inst, engineId, rundownId) {
    try {
        const items = await inst.api.lino.listItems(engineId, rundownId);
        
        // Log status information for debugging
        const itemsWithStatus = items.filter(item => item.status);
        if (itemsWithStatus.length > 0) {
            inst.log('info', `Received ${itemsWithStatus.length} items with status information`);
            inst.log('debug', `Status sample: ${JSON.stringify(itemsWithStatus[0].status)}`);
        } else {
            inst.log('debug', 'No status information in API response (may be older API version)');
        }
        
        // Store items with status
        inst.data.rundownItems[rundownId] = items;
        
        return items;
    } catch (error) {
        inst.log('error', `Failed to fetch rundown items: ${error.message}`);
        throw error;
    }
}

/**
 * Get item status by ID
 * @param {Object} inst - Module instance
 * @param {number} itemId - Item ID
 * @returns {Object|null} Status object or null if not available
 */
function getItemStatus(inst, itemId) {
    // Find item across all rundowns
    for (const rundownId in inst.data.rundownItems) {
        const items = inst.data.rundownItems[rundownId];
        const item = items.find(i => i.id === itemId);
        if (item && item.status) {
            return item.status;
        }
    }
    return null;
}

/**
 * Check if item is playing in a specific channel
 * @param {Object} inst - Module instance
 * @param {number} itemId - Item ID
 * @param {string} channel - 'program' or 'preview'
 * @returns {boolean}
 */
function isItemPlaying(inst, itemId, channel) {
    const status = getItemStatus(inst, itemId);
    if (!status) return false; // No status info, assume not playing
    
    const channelStatus = status[channel];
    return channelStatus === 'Playing';
}

/**
 * Check if channel is available for an item
 * @param {Object} inst - Module instance
 * @param {number} itemId - Item ID
 * @param {string} channel - 'program' or 'preview'
 * @returns {boolean}
 */
function isChannelAvailable(inst, itemId, channel) {
    const status = getItemStatus(inst, itemId);
    if (!status) return true; // No status info, assume available
    
    const channelStatus = status[channel];
    // Official API uses "Unavailable" - channel is available if not Unavailable
    return ['Available', 'Playing'].includes(channelStatus);
}

module.exports = {
    fetchRundownItems,
    getItemStatus,
    isItemPlaying,
    isChannelAvailable,
    // ... existing exports
};
```

### 2. Add Status Polling (Optional)

```javascript
// features/rundowns.js

/**
 * Start polling for rundown item status
 * @param {Object} inst - Module instance
 * @param {number} intervalMs - Poll interval in milliseconds (default: 5000)
 */
function startStatusPolling(inst, intervalMs = 5000) {
    // Clear existing poll
    if (inst.statusPollInterval) {
        clearInterval(inst.statusPollInterval);
    }
    
    inst.statusPollInterval = setInterval(async () => {
        try {
            // Refresh all loaded rundowns
            for (const rundownId in inst.data.rundownItems) {
                const engineId = inst.config.engineId; // Get from config
                await fetchRundownItems(inst, engineId, rundownId);
            }
            
            // Update all feedbacks after status refresh
            inst.checkFeedbacks();
        } catch (error) {
            inst.log('warn', `Status poll failed: ${error.message}`);
        }
    }, intervalMs);
    
    inst.log('info', `Started status polling every ${intervalMs}ms`);
}

/**
 * Stop polling for status
 * @param {Object} inst - Module instance
 */
function stopStatusPolling(inst) {
    if (inst.statusPollInterval) {
        clearInterval(inst.statusPollInterval);
        inst.statusPollInterval = null;
        inst.log('info', 'Stopped status polling');
    }
}

module.exports = {
    // ... existing exports
    startStatusPolling,
    stopStatusPolling,
};
```

---

## Feedbacks

### New Feedback Types

Add to `feedbacks.js`:

```javascript
// feedbacks.js

module.exports = function(instance) {
    const { getItemStatus, isItemPlaying } = require('./features/rundowns');
    
    return {
        // ... existing feedbacks
        
        /**
         * Feedback: Item is playing in Program
         */
        itemPlayingInProgram: {
            type: 'boolean',
            name: 'Item Playing in Program',
            description: 'Change button style when item is playing in Program channel',
            options: [
                {
                    type: 'number',
                    label: 'Item ID',
                    id: 'itemId',
                    default: 0,
                    min: 0,
                },
            ],
            defaultStyle: {
                bgcolor: combineRgb(220, 38, 38), // Red
                color: combineRgb(255, 255, 255),
            },
            callback: (feedback) => {
                const itemId = parseInt(feedback.options.itemId);
                return isItemPlaying(instance, itemId, 'program');
            },
        },
        
        /**
         * Feedback: Item is playing in Preview
         */
        itemPlayingInPreview: {
            type: 'boolean',
            name: 'Item Playing in Preview',
            description: 'Change button style when item is playing in Preview channel',
            options: [
                {
                    type: 'number',
                    label: 'Item ID',
                    id: 'itemId',
                    default: 0,
                    min: 0,
                },
            ],
            defaultStyle: {
                bgcolor: combineRgb(34, 197, 94), // Green
                color: combineRgb(255, 255, 255),
            },
            callback: (feedback) => {
                const itemId = parseInt(feedback.options.itemId);
                return isItemPlaying(instance, itemId, 'preview');
            },
        },
        
        /**
         * Feedback: Item is active (playing in any channel)
         */
        itemIsActive: {
            type: 'boolean',
            name: 'Item Is Active',
            description: 'Change button style when item is active in any channel',
            options: [
                {
                    type: 'number',
                    label: 'Item ID',
                    id: 'itemId',
                    default: 0,
                    min: 0,
                },
            ],
            defaultStyle: {
                bgcolor: combineRgb(234, 179, 8), // Yellow/Gold
                color: combineRgb(0, 0, 0),
            },
            callback: (feedback) => {
                const itemId = parseInt(feedback.options.itemId);
                const status = getItemStatus(instance, itemId);
                return status ? status.isActive : false;
            },
        },
        
        /**
         * Advanced: Status-aware button style
         * Shows different colors for PGM (red), PVW (green), or inactive (default)
         */
        itemStatusIndicator: {
            type: 'advanced',
            name: 'Item Status Indicator',
            description: 'Multi-state indicator showing program (red), preview (green), or inactive',
            options: [
                {
                    type: 'number',
                    label: 'Item ID',
                    id: 'itemId',
                    default: 0,
                    min: 0,
                },
            ],
            callback: (feedback) => {
                const itemId = parseInt(feedback.options.itemId);
                const status = getItemStatus(instance, itemId);
                
                if (!status) {
                    return {}; // No status, no style change
                }
                
                // Priority: Program > Preview > Inactive
                if (status.program === 'Playing') {
                    return {
                        bgcolor: combineRgb(220, 38, 38), // Red
                        color: combineRgb(255, 255, 255),
                    };
                } else if (status.preview === 'Playing') {
                    return {
                        bgcolor: combineRgb(34, 197, 94), // Green
                        color: combineRgb(255, 255, 255),
                    };
                }
                
                return {}; // Inactive, use default style
            },
        },
    };
};
```

---

## Actions

### Enhanced Actions with Status Checks

```javascript
// actions.js

module.exports = function(instance) {
    const { isItemPlaying, isChannelAvailable } = require('./features/rundowns');
    
    return {
        // ... existing actions
        
        /**
         * Smart Play: Only play if not already playing
         */
        playItemSmart: {
            name: 'Play Item (Smart - Skip if Playing)',
            options: [
                {
                    type: 'number',
                    label: 'Item ID',
                    id: 'itemId',
                    default: 0,
                    min: 0,
                },
                {
                    type: 'dropdown',
                    label: 'Channel',
                    id: 'channel',
                    default: 'program',
                    choices: [
                        { id: 'program', label: 'Program' },
                        { id: 'preview', label: 'Preview' },
                    ],
                },
                {
                    type: 'checkbox',
                    label: 'Show warning if already playing',
                    id: 'showWarning',
                    default: true,
                },
            ],
            callback: async (action) => {
                const itemId = parseInt(action.options.itemId);
                const channel = action.options.channel;
                const preview = channel === 'preview' ? 1 : 0;
                
                // Check if already playing
                if (isItemPlaying(instance, itemId, channel)) {
                    if (action.options.showWarning) {
                        instance.log('warn', `Item ${itemId} is already playing in ${channel}, skipping`);
                    }
                    return; // Skip action
                }
                
                // Check if channel is available
                if (!isChannelAvailable(instance, itemId, channel)) {
                    instance.log('error', `Channel ${channel} is not available for item ${itemId}`);
                    return;
                }
                
                // Proceed with play
                try {
                    const engineId = instance.config.engineId;
                    await instance.api.lino.play(engineId, itemId, preview);
                    instance.log('info', `Played item ${itemId} to ${channel}`);
                    
                    // Refresh status after action
                    setTimeout(() => instance.checkFeedbacks(), 500);
                } catch (error) {
                    instance.log('error', `Failed to play item: ${error.message}`);
                }
            },
        },
        
        /**
         * Smart Out: Only take out if playing
         */
        outItemSmart: {
            name: 'Out Item (Smart - Skip if Not Playing)',
            options: [
                {
                    type: 'number',
                    label: 'Item ID',
                    id: 'itemId',
                    default: 0,
                    min: 0,
                },
                {
                    type: 'dropdown',
                    label: 'Channel',
                    id: 'channel',
                    default: 'program',
                    choices: [
                        { id: 'program', label: 'Program' },
                        { id: 'preview', label: 'Preview' },
                    ],
                },
            ],
            callback: async (action) => {
                const itemId = parseInt(action.options.itemId);
                const channel = action.options.channel;
                const preview = channel === 'preview' ? 1 : 0;
                
                // Check if currently playing
                if (!isItemPlaying(instance, itemId, channel)) {
                    instance.log('debug', `Item ${itemId} is not playing in ${channel}, skipping out command`);
                    return; // Skip action
                }
                
                // Proceed with out
                try {
                    const engineId = instance.config.engineId;
                    await instance.api.lino.out(engineId, itemId, preview);
                    instance.log('info', `Took out item ${itemId} from ${channel}`);
                    
                    // Refresh status after action
                    setTimeout(() => instance.checkFeedbacks(), 500);
                } catch (error) {
                    instance.log('error', `Failed to take out item: ${error.message}`);
                }
            },
        },
    };
};
```

---

## Presets

### Example Presets with Status Feedback

```javascript
// presets.js

module.exports = function(instance) {
    return [
        // ... existing presets
        
        {
            type: 'button',
            category: 'Rundown Items (Status-Aware)',
            name: 'Play Item with Status',
            style: {
                text: 'PLAY\\n$(rhub:itemName)',
                size: '14',
                color: combineRgb(255, 255, 255),
                bgcolor: combineRgb(50, 50, 50),
            },
            steps: [
                {
                    down: [
                        {
                            actionId: 'playItemSmart',
                            options: {
                                itemId: 0, // User configures
                                channel: 'program',
                                showWarning: true,
                            },
                        },
                    ],
                    up: [],
                },
            ],
            feedbacks: [
                {
                    feedbackId: 'itemPlayingInProgram',
                    options: {
                        itemId: 0, // User configures
                    },
                    style: {
                        bgcolor: combineRgb(220, 38, 38),
                        color: combineRgb(255, 255, 255),
                        text: '🔴 ON AIR\\n$(rhub:itemName)',
                    },
                },
            ],
        },
        
        {
            type: 'button',
            category: 'Rundown Items (Status-Aware)',
            name: 'Dual Channel Control',
            style: {
                text: 'Item\\nControl',
                size: '14',
                color: combineRgb(255, 255, 255),
                bgcolor: combineRgb(50, 50, 50),
            },
            steps: [
                {
                    down: [
                        {
                            actionId: 'playItemSmart',
                            options: {
                                itemId: 0,
                                channel: 'program',
                            },
                        },
                    ],
                    up: [],
                },
            ],
            feedbacks: [
                // Show red when in Program
                {
                    feedbackId: 'itemPlayingInProgram',
                    options: { itemId: 0 },
                    style: {
                        bgcolor: combineRgb(220, 38, 38),
                        text: '🔴 PGM',
                    },
                },
                // Show green when in Preview (lower priority)
                {
                    feedbackId: 'itemPlayingInPreview',
                    options: { itemId: 0 },
                    style: {
                        bgcolor: combineRgb(34, 197, 94),
                        text: '🟢 PVW',
                    },
                },
            ],
        },
    ];
};
```

---

## Testing

### Test Scenarios

#### 1. Basic Status Display

```
Steps:
1. Configure instance with valid API key and engine
2. Load a rundown with items
3. Create button with itemPlayingInProgram feedback
4. Play item from Reality Hub UI
5. Verify button changes color

Expected: Button turns red when item plays
```

#### 2. Smart Action Prevention

```
Steps:
1. Create button with playItemSmart action
2. Play item from Reality Hub UI (item now playing)
3. Press Companion button again
4. Check logs

Expected: Log shows "already playing, skipping"
```

#### 3. Multi-Channel Status

```
Steps:
1. Create button with both PGM and PVW feedbacks
2. Play item to Preview
3. Verify button shows green
4. Play same item to Program
5. Verify button shows red (higher priority)

Expected: Color changes based on channel priority
```

#### 4. Status Polling

```
Steps:
1. Enable status polling (5 second interval)
2. Play item from Reality Hub UI
3. Wait for poll interval
4. Verify Companion button updates

Expected: Button reflects status within 5 seconds
```

#### 5. Backward Compatibility

```
Steps:
1. Connect to Reality Hub without status API
2. Create status-aware buttons
3. Trigger actions

Expected: Module works normally, no errors
```

---

## Performance Considerations

### Polling Impact

| Poll Interval | Network Load | CPU Usage | Recommendation |
|--------------|--------------|-----------|----------------|
| 1 second | High | Low | Not recommended |
| 5 seconds | Medium | Low | ✅ Recommended for active control |
| 10 seconds | Low | Low | ✅ Recommended for monitoring |
| 30+ seconds | Very Low | Low | Suitable for passive monitoring |

### Optimization Tips

1. **Only poll when needed**: Start polling when rundown page is active
2. **Smart caching**: Only refetch if changes detected
3. **Batch requests**: Fetch multiple rundowns in parallel
4. **Lazy loading**: Only fetch status for visible items
5. **Event-based updates**: Use WebSocket if available (future enhancement)

### Memory Considerations

- Status adds ~200 bytes per item
- 100 items = ~20 KB additional memory
- Negligible impact on modern systems

---

## Backward Compatibility

### Handling Missing Status Field

The implementation must gracefully handle API responses without the `status` field:

```javascript
function getItemStatus(inst, itemId) {
    const item = findItem(inst, itemId);
    
    // Check if status exists
    if (!item || !item.status) {
        return null; // No status available
    }
    
    return item.status;
}

function isItemPlaying(inst, itemId, channel) {
    const status = getItemStatus(inst, itemId);
    
    // Graceful degradation: if no status, assume not playing
    if (!status) {
        return false;
    }
    
    return status[channel] === 'Playing';
}
```

### Version Detection

```javascript
// Check if API supports status
async function checkStatusSupport(inst) {
    try {
        const items = await inst.api.lino.listItems(engineId, rundownId);
        
        if (items.length > 0 && items[0].status) {
            inst.log('info', '✅ API supports item status');
            inst.data.statusSupported = true;
            return true;
        } else {
            inst.log('warn', '⚠️ API does not support item status (older version)');
            inst.data.statusSupported = false;
            return false;
        }
    } catch (error) {
        inst.log('error', `Failed to check status support: ${error.message}`);
        return false;
    }
}
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Update `features/rundowns.js` to store status
- [ ] Add helper functions: `getItemStatus()`, `isItemPlaying()`, `isChannelAvailable()`
- [ ] Add logging for status information
- [ ] Test with API that returns status

### Phase 2: Feedbacks
- [ ] Create `itemPlayingInProgram` feedback
- [ ] Create `itemPlayingInPreview` feedback
- [ ] Create `itemIsActive` feedback
- [ ] Create `itemStatusIndicator` advanced feedback
- [ ] Test feedback updates

### Phase 3: Actions
- [ ] Create `playItemSmart` action
- [ ] Create `outItemSmart` action
- [ ] Add status checks to existing actions (optional)
- [ ] Test action preconditions

### Phase 4: Presets
- [ ] Create example presets with status feedbacks
- [ ] Update existing presets to use status-aware actions
- [ ] Document preset usage

### Phase 5: Polling (Optional)
- [ ] Implement `startStatusPolling()` and `stopStatusPolling()`
- [ ] Add configuration option for poll interval
- [ ] Add enable/disable toggle in config
- [ ] Test performance impact

### Phase 6: Testing & Documentation
- [ ] Test all scenarios from Testing section
- [ ] Update HELP.md with status features
- [ ] Update README with status examples
- [ ] Create video demo (optional)

---

## Future Enhancements

### WebSocket Support

Instead of polling, use WebSocket for real-time updates:

```javascript
// Future: WebSocket-based status updates
instance.ws = new WebSocket(`ws://${instance.config.host}/api/ws`);

instance.ws.on('message', (data) => {
    const event = JSON.parse(data);
    
    if (event.type === 'itemStatusChanged') {
        updateItemStatus(instance, event.itemId, event.status);
        instance.checkFeedbacks(); // Update UI
    }
});
```

### Status History

Track status changes over time for debugging:

```javascript
instance.data.statusHistory = [];

function logStatusChange(inst, itemId, oldStatus, newStatus) {
    inst.data.statusHistory.push({
        timestamp: Date.now(),
        itemId,
        oldStatus,
        newStatus,
    });
    
    // Keep only last 100 changes
    if (inst.data.statusHistory.length > 100) {
        inst.data.statusHistory.shift();
    }
}
```

### Variables Integration

Expose status as Companion variables:

```javascript
// variables.js
instance.setVariableValues({
    [`item_${itemId}_status_pgm`]: status.program,
    [`item_${itemId}_status_pvw`]: status.preview,
    [`item_${itemId}_is_active`]: status.isActive,
});
```

---

## Support & Troubleshooting

### Common Issues

**Issue:** Feedbacks not updating  
**Solution:** Enable status polling or manually refresh after actions

**Issue:** Status always shows "not playing"  
**Solution:** Verify API version supports status field, check API response in logs

**Issue:** High network traffic  
**Solution:** Increase poll interval or disable polling when not needed

**Issue:** Buttons out of sync with Reality Hub  
**Solution:** Reduce poll interval or trigger manual refresh

### Debug Mode

Enable verbose logging:

```javascript
inst.config.debugStatus = true;

if (inst.config.debugStatus) {
    inst.log('debug', `Item ${itemId} status: ${JSON.stringify(status)}`);
}
```

---

## References

- **Dashboard Implementation**: See `rhub-api-dashboard/src/components/Lino.svelte` for UI reference
- **API Documentation**: `rhub-mcp-server/rest-api-gitbook.yaml`
- **Testing Guide**: `rhub-api-dashboard/STATUS-FEATURE-TESTING.md`

---

**Document Version:** 1.0  
**Last Updated:** January 5, 2026  
**Author:** AI Assistant  
**Status:** Ready for implementation
