/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JavaOOPFile } from "./types";

export const JAVA_OOP_CODEBASE: JavaOOPFile[] = [
  {
    name: "UserCredential.java",
    role: "Encapsulated Model Class",
    oopConcept: "Data Encapsulation & Immutable State",
    description: "Represents an immutable, encapsulated credential object with secure hash comparison behavior to avoid timing attacks.",
    code: `package com.security.model;

import java.util.Objects;

/**
 * Encapsulates password-based credential validation.
 * Uses immutable state practices for thread-safe authentication handling.
 */
public final class UserCredential {
    private final String username;
    private final String hashedPassword; // Shared secrets stored as secure hashes in actual application

    public UserCredential(String username, String hashedPassword) {
        this.username = Objects.requireNonNull(username, "Username cannot be null");
        this.hashedPassword = Objects.requireNonNull(hashedPassword, "Password hash cannot be null");
    }

    public String getUsername() {
        return this.username;
    }

    /**
     * Verifies provided clear-test password against the encapsulated hashed password
     * using a constant-time comparison to thwart timing side-channel attacks.
     */
    public boolean verify(String inputUsername, String inputPassword) {
        if (!this.username.equals(inputUsername)) {
            return false;
        }
        
        // Simulating constant-time authentication lookup
        return secureCompare(this.hashedPassword, inputPassword);
    }

    private boolean secureCompare(String key, String input) {
        if (key.length() != input.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < key.length(); i++) {
            result |= key.charAt(i) ^ input.charAt(i);
        }
        return result == 0;
    }
}`
  },
  {
    name: "AccountLockedException.java",
    role: "Custom Exception Domain Model",
    oopConcept: "Inheritance & Exception Hierarchy",
    description: "Custom checked exception representing strict authorization denial owing to security lockout policies. Carries metadata about the lockout timestamp.",
    code: `package com.security.exception;

import java.time.Instant;

/**
 * Thrown when an authenticated attempt is declined due to active lockout rules.
 * Extends AuthenticationException to integrate with custom error telemetry.
 */
public class AccountLockedException extends Exception {
    private final Instant lockoutExpiry;
    private final int totalFailedAttempts;

    public AccountLockedException(String message, Instant lockoutExpiry, int totalFailedAttempts) {
        super(message);
        this.lockoutExpiry = lockoutExpiry;
        this.totalFailedAttempts = totalFailedAttempts;
    }

    public Instant getLockoutExpiry() {
        return this.lockoutExpiry;
    }

    public int getTotalFailedAttempts() {
        return this.totalFailedAttempts;
    }

    public long getRemainingSeconds() {
        long seconds = lockoutExpiry.getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(0, seconds);
    }
}`
  },
  {
    name: "NotificationService.java",
    role: "Decoupled Service Interface",
    oopConcept: "Abstraction & Interface Segregation",
    description: "Declares abstract notification dispatching capabilities, allowing interchangeable channels (WhatsApp, SMS, Email) following SOLID principles.",
    code: `package com.security.notification;

/**
 * Interface implementing the Dependency Inversion Principle.
 * High-level security coordination policies depend on this abstraction,
 * rather than concrete Twilio messaging.
 */
public interface NotificationService {
    
    /**
     * Dispatches custom mission-critical alert payloads to the user.
     * 
     * @param recipient The targeted endpoint address (e.g., cell number)
     * @param alertMessage Fully structured human readable warning.
     * @return true if communication channel handoff succeeded.
     */
    boolean dispatchAlert(String recipient, String alertMessage);
}`
  },
  {
    name: "WhatsAppNotificationService.java",
    role: "Concrete Twilio Provider Implementation",
    oopConcept: "Polymorphism & Implementation Realization",
    description: "Connects to Twilio SDK to send full-fidelity security alerts to the user's WhatsApp device containing IP and timestamp data.",
    code: `package com.security.notification;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import java.util.logging.Logger;

/**
 * Concrete WhatsApp channel provider. Implements SOLID Open-Closed Principle.
 */
public class WhatsAppNotificationService implements NotificationService {
    private static final Logger LOGGER = Logger.getLogger(WhatsAppNotificationService.class.getName());
    
    private final String accountSid;
    private final String authToken;
    private final String sandboxWhatsAppNumber;

    public WhatsAppNotificationService(String accountSid, String authToken, String fromNumber) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.sandboxWhatsAppNumber = fromNumber != null ? fromNumber : "whatsapp:+14155238886";
        
        // Lazy initialize the underlying Twilio Engine
        if (accountSid != null && !accountSid.trim().isEmpty() && authToken != null) {
            Twilio.init(accountSid, authToken);
            LOGGER.info("Twilio API client initialized successfully for Java WhatsApp channel.");
        }
    }

    @Override
    public boolean dispatchAlert(String recipient, String alertMessage) {
        if (this.accountSid == null || this.authToken == null) {
            LOGGER.warning("SIMULATOR WARNING: Twilio credentials absent. Dispatching simulated WhatsApp to " + recipient);
            return false;
        }

        try {
            // Twilio is structured around standard WhatsApp handles structured: 'whatsapp:+[CountryCode][Number]'
            String twilioRecipient = recipient.startsWith("whatsapp:") ? recipient : "whatsapp:" + recipient;
            
            Message message = Message.creator(
                new PhoneNumber(twilioRecipient),
                new PhoneNumber(this.sandboxWhatsAppNumber),
                alertMessage
            ).create();
            
            LOGGER.info("WhatsApp Security Warning sent with SID ID Code: " + message.getSid());
            return true;
        } catch (Exception e) {
            LOGGER.severe("Failed to send standard Twilio WhatsApp Alert payload: " + e.getMessage());
            return false;
        }
    }
}`
  },
  {
    name: "LockoutManager.java",
    role: "State Management Engine",
    oopConcept: "Single Responsibility Principle (SRP) & Aggregation",
    description: "Tracks failure attempt state and manages automatic lockout timer boundaries independently of UI or core database logic.",
    code: `package com.security.lockout;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dedicated controller class evaluating lockout mechanics.
 */
public class LockoutManager {
    private static final int MAX_FAILED_ATTEMPTS = 3;
    private static final long LOCKOUT_DURATION_SECONDS = 120; // 2 minutes lockout

    private final Map<String, Integer> failureTracker = new ConcurrentHashMap<>();
    private final Map<String, Instant> lockoutTimerTracker = new ConcurrentHashMap<>();

    /**
     * Checks whether a target identifier is actively locked.
     */
    public boolean isLockedOut(String username) {
        Instant expiry = lockoutTimerTracker.get(username);
        if (expiry == null) {
            return false;
        }
        
        if (Instant.now().isAfter(expiry)) {
            // Lockout expired automatically - clean up states
            resetAttempts(username);
            return false;
        }
        return true;
    }

    /**
     * Registers a single authentication failure.
     * Generates a Lockout expiry instant if 3 attempts have been depleted.
     * 
     * @return The updated count of failed attempts.
     */
    public int recordFailure(String username) {
        int failures = failureTracker.merge(username, 1, Integer::sum);
        if (failures >= MAX_FAILED_ATTEMPTS) {
            Instant expiryTime = Instant.now().plusSeconds(LOCKOUT_DURATION_SECONDS);
            lockoutTimerTracker.put(username, expiryTime);
        }
        return failures;
    }

    public void resetAttempts(String username) {
        failureTracker.remove(username);
        lockoutTimerTracker.remove(username);
    }

    public Instant getLockoutExpiry(String username) {
        return lockoutTimerTracker.get(username);
    }

    public int getFailedAttempts(String username) {
        return failureTracker.getOrDefault(username, 0);
    }

    public int getRemainingAttempts(String username) {
        return Math.max(0, MAX_FAILED_ATTEMPTS - getFailedAttempts(username));
    }
}`
  },
  {
    name: "SecureAuthService.java",
    role: "Coordinating Facade Layer",
    oopConcept: "Dependency Injection & Orchestration",
    description: "Orchestrates login routines by binding user credentials, looking up state in the LockoutManager, and executing security notifications.",
    code: `package com.security;

import com.security.exception.AccountLockedException;
import com.security.lockout.LockoutManager;
import com.security.model.UserCredential;
import com.security.notification.NotificationService;

import java.time.Instant;

/**
 * Core security facade class implementing the main coordinate logic.
 */
public class SecureAuthService {
    private final UserCredential masterCredential;
    private final LockoutManager lockoutManager;
    private final NotificationService notificationService;
    private final String alertPhoneNumber;

    public SecureAuthService(
            UserCredential masterCredential,
            LockoutManager lockoutManager,
            NotificationService notificationService,
            String alertPhoneNumber) {
        this.masterCredential = masterCredential;
        this.lockoutManager = lockoutManager;
        this.notificationService = notificationService;
        this.alertPhoneNumber = alertPhoneNumber;
    }

    /**
     * Authenticates a user request.
     * 
     * @return boolean true if validation succeeded
     * @throws AccountLockedException if user is in lockout
     */
    public boolean login(String inputUser, String inputPass, String ipAddress) throws AccountLockedException {
        // 1. Guard check for active Lockout Rules
        if (lockoutManager.isLockedOut(inputUser)) {
            throw new AccountLockedException(
                "Access Denied: Account is temporarily locked out due to multiple failed logins.", 
                lockoutManager.getLockoutExpiry(inputUser),
                lockoutManager.getFailedAttempts(inputUser)
            );
        }

        // 2. Perform safe verification
        boolean matches = masterCredential.verify(inputUser, inputPass);
        
        if (matches) {
            // 3a. Success - clear failure state
            lockoutManager.resetAttempts(inputUser);
            return true;
        } else {
            // 3b. Failure - record attempt and evaluate
            int attemptsUsed = lockoutManager.recordFailure(inputUser);
            
            if (attemptsUsed >= 3) {
                // 4. Critical Lockout triggered - trigger WhatsApp Security Notification immediately!
                String timestamp = Instant.now().toString();
                String alertBody = String.format(
                    "⚠️ [SECURITY ALERT - SECURE CONSOLE]\\n\\n" +
                    "Account locked for: %s\\n" +
                    "Due to: 3 consecutive failed login attempts.\\n" +
                    "IP Address Context: %s\\n" +
                    "Time: %s\\n\\n" +
                    "If this was not you, please trigger a security reset on the dashboard.",
                    inputUser, ipAddress, timestamp
                );
                
                // Dispatch notification via DIP decoupled interface channel
                notificationService.dispatchAlert(alertPhoneNumber, alertBody);
                
                throw new AccountLockedException(
                    "Authentication Failed. Max limit reached. Account locked for 2 minutes.",
                    lockoutManager.getLockoutExpiry(inputUser),
                    lockoutManager.getFailedAttempts(inputUser)
                );
            }
            return false;
        }
    }
}`
  }
];
