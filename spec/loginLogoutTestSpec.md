# Test Case 1: Successful login with correct email and password

**Preconditions:**

- A registered user exists
- User is on the login page
- User is logged out

**Test Data:**

- Email: registered email address (e.g. `user@example.com`)
- Password: the correct password for that account

**Steps:**

1. Navigate to the login page
2. Enter the registered email address
3. Enter the correct password
4. Submit the login form

**Expected Result:**

- The user is logged in and reaches the app's authenticated area
- A server-side session is created for the user

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 2: Login rejected with wrong password

**Preconditions:**

- A registered user exists
- User is on the login page
- User is logged out

**Test Data:**

- Email: registered email address (e.g. `user@example.com`)
- Password: incorrect password (e.g. `WrongPassword123`)

**Steps:**

1. Navigate to the login page
2. Enter the registered email address
3. Enter the incorrect password
4. Submit the login form

**Expected Result:**

- The system displays a generic error message (e.g. "Invalid email or password")
- The message does not reveal whether the email exists
- No session is created and the user stays on the login page

**Priority:** High
**Type:** Negative / Functional

---

# Test Case 3: Login rejected with unknown email

**Preconditions:**

- No account is associated with the email being used
- User is on the login page
- User is logged out

**Test Data:**

- Email: unregistered email address (e.g. `unknown@example.com`)
- Password: any password

**Steps:**

1. Navigate to the login page
2. Enter the unregistered email address
3. Enter any password
4. Submit the login form

**Expected Result:**

- The system displays the same generic error message as in Test Case 2
- No session is created and the user stays on the login page

**Priority:** High
**Type:** Negative / Functional

---

# Test Case 4: Repeated failed logins do not lock the account

**Preconditions:**

- A registered user exists
- User is on the login page
- User is logged out

**Test Data:**

- Email: registered email address (e.g. `user@example.com`)
- Wrong password: `WrongPassword123`
- Correct password: the valid password for that account

**Steps:**

1. Navigate to the login page
2. Submit the login form with the correct email and wrong password 10 times in a row
3. Submit the login form with the correct email and correct password

**Expected Result:**

- Each failed attempt shows the generic error message
- No lockout or rate limiting is applied
- The final login with correct credentials succeeds

**Priority:** Medium
**Type:** Negative / Functional

---

# Test Case 5: Successful logout

**Preconditions:**

- User is logged in
- User is in the authenticated area

**Test Data:**

- None

**Steps:**

1. Click "Log out"

**Expected Result:**

- The active session is ended on the server
- The user is returned to the login page

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 6: Authenticated pages are not accessible after logout

**Preconditions:**

- User is logged in
- User has logged out (Test Case 5)

**Test Data:**

- Session cookie of the ended session (captured before logout)

**Steps:**

1. Try to open an authenticated page directly (e.g. via URL or browser back button)
2. Send an authenticated request (e.g. `GET /api/me`) with the old session cookie

**Expected Result:**

- The user is redirected to the login page
- The request is rejected as unauthenticated (401)
- The user can only access authenticated pages again after logging in

**Priority:** High
**Type:** Negative / Security

---

# Test Case 7: Authenticated pages are not accessible without logging in

**Preconditions:**

- User has no active session

**Test Data:**

- None

**Steps:**

1. Try to open an authenticated page directly via URL

**Expected Result:**

- The user is redirected to the login page
- Authenticated API requests are rejected (401)

**Priority:** High
**Type:** Negative / Security

---

# Test Case 8: Session persists after page reload

**Preconditions:**

- User is logged in
- User is in the authenticated area

**Test Data:**

- None

**Steps:**

1. Reload the browser page

**Expected Result:**

- The user remains logged in and stays in the authenticated area

**Priority:** Medium
**Type:** Positive / Functional
