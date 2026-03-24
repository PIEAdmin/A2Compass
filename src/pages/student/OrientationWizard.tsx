import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import {
  getOnboardingState,
  updateOnboardingStep,
  savePreferences,
  getPreferences,
  completeOrientation,
  OnboardingState,
  StudentPreferences,
} from '../../services/onboarding.service';
