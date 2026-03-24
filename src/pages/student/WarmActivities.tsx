import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks';
import {
  getWarmActivities,
  getWarmActivityProgress,
  startWarmActivity,
  completeWarmActivity,
  getBadges,
  getAllBadges,
  getPreferences,
  WarmActivity,
  WarmActivityProgress,
  StudentBadge,
  Badge,
} from '../../services/onboarding.service';
