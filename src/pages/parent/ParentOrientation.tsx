import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import {
  bookAssessment,
  getBookings,
  AssessmentBooking,
} from '../../services/onboarding.service';
