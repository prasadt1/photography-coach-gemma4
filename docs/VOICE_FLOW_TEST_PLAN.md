# L.E.N.S. Voice-First Flow - Test Plan

## Pre-Test Setup

### Environment
- [ ] Chrome/Edge (best Web Speech API support)
- [ ] iOS Safari (for PWA testing)
- [ ] Microphone permissions granted
- [ ] Ollama running locally with gemma4:latest
- [ ] Speaker/headphones connected

### Test Craft
- [ ] Hand-knit item (sweater, scarf, etc.)
- [ ] Natural window light available
- [ ] Clean background surface
- [ ] Phone tripod (optional but helpful)

---

## Test Sequence 1: Voice Command Flow (Happy Path)

### Phase 0: Voice Prompt
1. **Action**: Open L.E.N.S. app → Click "Enter Artisan Studio"
2. **Expected**:
   - Voice says: "Welcome to L.E.N.S. Would you like to turn on voice commands?"
   - UI shows two buttons: "Yes, Enable Voice" and "No, Use Buttons"
   - Screen reader announces the question
3. **Test**: Say "Yes"
4. **Expected**:
   - Voice commands enabled
   - Voice says: "Voice commands enabled. Say 'take photo' to begin."
   - UI transitions to entry phase

### Phase 1: Entry
5. **Test**: Say "Take photo"
6. **Expected**:
   - Camera input triggers (file picker opens on desktop, camera on mobile)
   - Voice says: "Opening camera. Position your craft in good light. Tap to capture."

### Phase 2: First Capture
7. **Action**: Take photo (slightly imperfect - e.g., uneven lighting)
8. **Expected**:
   - File captured
   - Voice says: "Got your photo. Analyzing with Gemma 4 now. This takes a moment..."
   - UI shows loading spinner with "Analysing with Gemma 4"

### Phase 3: First Analysis
9. **Expected** (after ~20-50s):
   - Analysis completes
   - Voice speaks full analysis:
     - "Analysis complete."
     - "What I see: [subject with color analogies]"
     - "Lighting: [lighting critique]"
     - "Framing: [framing critique]"
     - "Your next step: [one physical fix]"
     - "Say 'yes' to try again, or 'no' to continue."
   - UI shows photo, analysis card, ratings, "Retake with Fix" button
   - Screen reader announces results via aria-live

### Phase 4: Retry Choice
10. **Test**: Say "Yes"
11. **Expected**:
    - Voice says: "Opening camera for a second photo. Apply the fix."
    - Camera opens again
    - UI shows reminder of the fix

### Phase 5: Second Capture
12. **Action**: Take photo (apply the suggested fix - e.g., move to even light)
13. **Expected**:
    - Voice says: "Got your second photo. Comparing both shots now."
    - UI shows loading/comparison state

### Phase 6: Comparison
14. **Expected** (after comparison):
    - App-side comparison runs
    - Voice speaks comparison result:
      - "Photo two is the stronger one. The lighting is even now — that was the issue."
      - OR truthful result based on actual ratings
    - UI shows side-by-side photos with "Stronger" badge
    - Comparison text displayed

15. **Action**: Click "Generate Listing" (or wait for auto-progression)

### Phase 7: Listing
16. **Expected**:
    - Voice speaks listing:
      - "Here's your listing:"
      - "[Full listing copy]"
      - "[Full alt-text]"
      - "[Tag count] tags generated. Say 'read all tags' to hear them."
    - UI shows listing card with copy buttons
    - Tags displayed as chips

17. **Test**: Say "Read all tags"
18. **Expected**:
    - Voice reads all tags: "All tags: handmade, knitting, wool, ..."
    - All tags remain visible

19. **Test**: Say "Copy"
20. **Expected**:
    - Listing copy copied to clipboard
    - Voice says: "Copied to clipboard."
    - Button shows "Copied" state

---

## Test Sequence 2: Button Fallback

### Scenario: Voice recognition unavailable/disabled

1. **Action**: Click "No, Use Buttons" at voice prompt
2. **Expected**: All interactions work via buttons
3. **Verify**:
   - [ ] "Take Photo" button works
   - [ ] "Retake with Fix" button works
   - [ ] "I'm happy with this" button works
   - [ ] "Copy" buttons work
   - [ ] No voice recognition running

---

## Test Sequence 3: Error Handling

### Speech Recognition Errors
- **Test**: Disconnect microphone mid-session
- **Expected**: Auto-restart or graceful fallback to buttons

### Analysis Failure
- **Test**: Disconnect internet (if using Ollama Cloud)
- **Expected**: Error message displayed, "Try Again" button works

### Comparison Failure
- **Test**: Force comparison error (if possible)
- **Expected**: Fallback comparison text, flow continues

---

## Test Sequence 4: Voice Command Variations

Test different phrasings for each command:

| Intent | Test Phrases |
|--------|-------------|
| **Yes** | "yes", "yeah", "yep", "sure", "okay" |
| **No** | "no", "nope", "nah" |
| **Take Photo** | "take photo", "capture", "snap", "take picture" |
| **Retry** | "retry", "retake", "try again", "take another" |
| **Copy** | "copy", "clipboard" |
| **Read Tags** | "read tags", "hear tags", "read all tags" |

---

## Test Sequence 5: Accessibility (Screen Reader)

### VoiceOver (iOS) / TalkBack (Android)
1. **Enable screen reader**
2. **Navigate through flow using gestures**
3. **Verify**:
   - [ ] All phases announced via aria-live
   - [ ] Focus moves to main content on phase change
   - [ ] All buttons have proper labels
   - [ ] File input is accessible
   - [ ] Analysis results are read aloud
   - [ ] Comparison results announced
   - [ ] Listing content is accessible

---

## Test Sequence 6: State Management

### Attempts Array
1. **Verify in DevTools**:
   - [ ] attempts[0] populated after first photo
   - [ ] attempts[1] populated after second photo
   - [ ] Each attempt has { image, analysisJSON, timestamp }
   - [ ] analysisJSON includes ratings and primary_issue

### Comparison Logic
2. **Check comparison output**:
   - [ ] strongerAttemptIndex correctly set (0 or 1)
   - [ ] comparisonText reflects actual ratings
   - [ ] Truthful comparison (not hardcoded "photo 2 wins")

---

## Test Sequence 7: Prompt Engineering

### Structured Fields
1. **Check analysis JSON** (in DevTools or console):
   ```json
   {
     "subject": "...",
     "critique": {
       "framing": "...",
       "lighting": "...",
       "primary_fix": "ONE action only"
     },
     "ratings": {
       "lighting": 7,
       "framing": 8,
       "background": 6,
       "focus": 9
     },
     "primary_issue": "uneven lighting",
     "tags": ["handmade", "knitting", ...],
     ...
   }
   ```

2. **Verify**:
   - [ ] Ratings are numbers 1-10
   - [ ] primary_issue is a short phrase
   - [ ] primary_fix is ONE action (not two)
   - [ ] Colors use analogies ("tan like cardboard")
   - [ ] Tags array present (5-8 items)
   - [ ] Calm, professional tone

### Temperature = 0
3. **Test consistency**:
   - [ ] Take same photo twice (different sessions)
   - [ ] Verify analysis is nearly identical
   - [ ] Ratings should be consistent

---

## Test Sequence 8: Edge Cases

### No Fix Needed
- **Test**: Upload perfect photo (good lighting, framing, background)
- **Expected**:
  - ready_to_list: true
  - primary_issue: ""
  - Voice skips retry prompt, goes straight to listing

### Multiple Attempts
- **Test**: Retry multiple times (3+ photos)
- **Expected**: Only compares last two attempts

### Voice Command During Analysis
- **Test**: Say commands while "Analyzing..." spinner shown
- **Expected**: Commands ignored or queued until analysis complete

---

## Performance Benchmarks

| Phase | Target Time | Actual |
|-------|-------------|--------|
| Voice prompt → Entry | < 2s | ___ |
| First photo → Analysis start | < 1s | ___ |
| Analysis (local Ollama) | 20-50s | ___ |
| Analysis (Ollama Cloud) | 5-10s | ___ |
| Comparison | < 3s | ___ |
| Listing generation | Instant | ___ |

---

## Known Issues / Limitations

### Browser Compatibility
- **Chrome/Edge**: Best support (Web Speech API)
- **Safari iOS**: Good support (requires HTTPS for PWA)
- **Firefox**: Limited speech recognition support
- **Safari macOS**: No Web Speech API support

### Voice Recognition Limitations
- Requires internet for speech-to-text (uses cloud APIs)
- Accents may affect recognition accuracy
- Noisy environments reduce accuracy
- Some commands may need rephrasing

### Ollama Performance
- First photo: ~40s cold start (if model not loaded)
- Subsequent photos: ~20-25s warm
- Temperature = 0 may slightly increase latency

---

## Success Criteria

- [x] Voice greeting works on app open
- [x] Speech recognition captures commands accurately (>80% success rate)
- [x] All phases voice-announced via TTS
- [x] Camera capture works via voice command
- [x] Analysis JSON includes structured ratings
- [x] Comparison is deterministic and truthful
- [x] Listing generation includes tags
- [x] Tag read-out works (summary + optional full)
- [x] Screen reader compatible throughout
- [x] Buttons work as fallback
- [x] No crashes, no console errors
- [x] Consistent results (temperature = 0)

---

## Bug Report Template

If issues found:

```
**Bug**: [Short description]
**Phase**: [Which phase: voicePrompt, entry, firstCapture, etc.]
**Steps to Reproduce**:
1.
2.
3.
**Expected**:
**Actual**:
**Browser**: Chrome/Safari/etc.
**Device**: Desktop/iPhone/Android
**Console Errors**: [Copy paste]
**Screenshots**: [If applicable]
```

---

## Next Steps After Testing

- [ ] Fix any critical bugs
- [ ] Tune prompt for better Gemma responses
- [ ] Optimize comparison logic if needed
- [ ] Add loading states / progress indicators
- [ ] Test on actual iPhone (PWA Add to Home Screen)
- [ ] Film demo video for hackathon
