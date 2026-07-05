       IDENTIFICATION DIVISION.
       PROGRAM-ID. VALIDATE-PROFILE.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  PROFILE-TYPE       PIC X(20).
       01  FULL-NAME          PIC X(120).
       01  AGE-TEXT           PIC X(10).
       01  GENDER-TEXT        PIC X(30).
       01  PHONE-TEXT         PIC X(40).
       01  EMAIL-TEXT         PIC X(160).
       01  ADDRESS-TEXT       PIC X(500).
       01  MEDICAL-TEXT       PIC X(500).
       01  BLOOD-TEXT         PIC X(10).
       01  ALLERGIES-TEXT     PIC X(300).
       01  ADMISSION-TEXT     PIC X(80).
       01  USERNAME-TEXT      PIC X(80).
       01  PASSWORD-TEXT      PIC X(80).
       01  CONFIRM-TEXT       PIC X(80).
       01  POSITION-TEXT      PIC X(120).
       01  WORK-AREA-TEXT     PIC X(120).
       01  HIRE-DATE-TEXT     PIC X(80).
       01  NURSE-STATUS-TEXT  PIC X(80).
       01  BIRTHDATE-TEXT     PIC X(80).
       01  EMERGENCY-NAME     PIC X(100).
       01  EMERGENCY-PHONE    PIC X(40).
       01  ELDERLY-STATUS     PIC X(20).
       01  ENROLL-DATE        PIC X(80).
       01  AGE-NUMBER         PIC 9(3) VALUE 0.
       01  BIRTH-YEAR         PIC 9(4) VALUE 0.
       01  BIRTH-MONTH        PIC 9(2) VALUE 0.
       01  BIRTH-DAY          PIC 9(2) VALUE 0.
       01  TODAY-YYYYMMDD     PIC 9(8) VALUE 0.
       01  TODAY-YEAR         PIC 9(4) VALUE 0.
       01  TODAY-MONTH        PIC 9(2) VALUE 0.
       01  TODAY-DAY          PIC 9(2) VALUE 0.
       01  BIRTH-YYYYMMDD     PIC 9(8) VALUE 0.
       01  BIRTH-AGE          PIC 9(3) VALUE 0.
       01  BIRTHDATE-BAD      PIC X VALUE "N".
       01  ERROR-COUNT        PIC 9(2) VALUE 0.
       01  AT-COUNT           PIC 9(3) VALUE 0.
       01  DOT-COUNT          PIC 9(3) VALUE 0.
       01  LETTER-COUNT       PIC 9(3) VALUE 0.
       01  NAME-IDX           PIC 9(3) VALUE 1.
       01  EMAIL-IDX          PIC 9(3) VALUE 1.
       01  EMAIL-LEN          PIC 9(3) VALUE 0.
       01  AT-POS             PIC 9(3) VALUE 0.
       01  DOT-POS            PIC 9(3) VALUE 0.
       01  EMAIL-FORMAT-BAD   PIC X VALUE "N".
       01  OUTPUT-JSON        PIC X(4096) VALUE SPACES.
       01  FIELD-ERROR        PIC X(512) VALUE SPACES.

       PROCEDURE DIVISION.
           ACCEPT PROFILE-TYPE.
           ACCEPT FULL-NAME.
           ACCEPT AGE-TEXT.
           ACCEPT GENDER-TEXT.
           ACCEPT PHONE-TEXT.
           ACCEPT EMAIL-TEXT.
           ACCEPT ADDRESS-TEXT.
           ACCEPT MEDICAL-TEXT.
           ACCEPT BLOOD-TEXT.
           ACCEPT ALLERGIES-TEXT.
           ACCEPT ADMISSION-TEXT.
           ACCEPT USERNAME-TEXT.
           ACCEPT PASSWORD-TEXT.
           ACCEPT CONFIRM-TEXT.
           ACCEPT POSITION-TEXT.
           ACCEPT WORK-AREA-TEXT.
           ACCEPT HIRE-DATE-TEXT.
           ACCEPT NURSE-STATUS-TEXT.
           ACCEPT BIRTHDATE-TEXT.
           ACCEPT EMERGENCY-NAME.
           ACCEPT EMERGENCY-PHONE.
           ACCEPT ELDERLY-STATUS.
           ACCEPT ENROLL-DATE.

           MOVE '{"valid":false,"errors":{' TO OUTPUT-JSON.

           IF FUNCTION TRIM(FULL-NAME) = SPACES
               PERFORM ADD-NAME-REQUIRED
           ELSE
               IF FUNCTION LENGTH(FUNCTION TRIM(FULL-NAME)) > 10
                   PERFORM ADD-NAME-LENGTH
               END-IF
               IF FULL-NAME(1:1) = SPACE
                   PERFORM ADD-NAME-SPACES
               END-IF
               MOVE 0 TO LETTER-COUNT
             PERFORM VARYING NAME-IDX FROM 1 BY 1
             UNTIL NAME-IDX > FUNCTION LENGTH(FUNCTION TRIM(FULL-NAME))
                   IF (FULL-NAME(NAME-IDX:1) >= "A"
                       AND FULL-NAME(NAME-IDX:1) <= "Z")
                       OR (FULL-NAME(NAME-IDX:1) >= "a"
                       AND FULL-NAME(NAME-IDX:1) <= "z")
                       ADD 1 TO LETTER-COUNT
                   END-IF
               END-PERFORM
               IF LETTER-COUNT = 0
                   PERFORM ADD-NAME-LETTER
               END-IF
           END-IF.

           IF FUNCTION TRIM(AGE-TEXT) = SPACES
               PERFORM ADD-AGE-REQUIRED
           ELSE
               IF FUNCTION TEST-NUMVAL(FUNCTION TRIM(AGE-TEXT)) = 0
                   MOVE FUNCTION NUMVAL(AGE-TEXT) TO AGE-NUMBER
                   IF FUNCTION TRIM(PROFILE-TYPE) = "nurse"
                       IF AGE-NUMBER < 18 OR AGE-NUMBER > 80
                           PERFORM ADD-AGE-RANGE-NURSE
                       END-IF
                   ELSE
                       IF AGE-NUMBER < 50 OR AGE-NUMBER > 120
                           PERFORM ADD-AGE-RANGE-ELDERLY
                       END-IF
                   END-IF
               ELSE
                   PERFORM ADD-AGE-NUMBER
               END-IF
           END-IF.

           IF FUNCTION TRIM(GENDER-TEXT) = SPACES
               PERFORM ADD-GENDER-REQUIRED
           END-IF.

           IF FUNCTION TRIM(PHONE-TEXT) = SPACES
               PERFORM ADD-PHONE-REQUIRED
           ELSE
               PERFORM CHECK-PHONE-FORMAT
           END-IF.

           IF FUNCTION TRIM(EMAIL-TEXT) NOT = SPACES
               IF FUNCTION LENGTH(FUNCTION TRIM(EMAIL-TEXT)) > 160
                   PERFORM ADD-EMAIL-LENGTH
               END-IF
               MOVE "N" TO EMAIL-FORMAT-BAD
            MOVE FUNCTION LENGTH(FUNCTION TRIM(EMAIL-TEXT)) TO EMAIL-LEN
               MOVE 0 TO AT-COUNT
               MOVE 0 TO DOT-COUNT
               MOVE 0 TO AT-POS
               MOVE 0 TO DOT-POS
               INSPECT EMAIL-TEXT TALLYING AT-COUNT FOR ALL "@"
               INSPECT EMAIL-TEXT TALLYING DOT-COUNT FOR ALL "."
               PERFORM VARYING EMAIL-IDX FROM 1 BY 1
                   UNTIL EMAIL-IDX > EMAIL-LEN
                   IF EMAIL-TEXT(EMAIL-IDX:1) = "@"
                       MOVE EMAIL-IDX TO AT-POS
                   END-IF
                   IF EMAIL-TEXT(EMAIL-IDX:1) = "."
                       MOVE EMAIL-IDX TO DOT-POS
                   END-IF
               END-PERFORM
               IF AT-COUNT NOT = 1 OR DOT-COUNT NOT = 1
                   MOVE "Y" TO EMAIL-FORMAT-BAD
               END-IF
               IF NOT ((EMAIL-TEXT(1:1) >= "A"
                   AND EMAIL-TEXT(1:1) <= "Z")
                   OR (EMAIL-TEXT(1:1) >= "a"
                   AND EMAIL-TEXT(1:1) <= "z"))
                   MOVE "Y" TO EMAIL-FORMAT-BAD
               END-IF
               IF AT-POS <= 1
                   MOVE "Y" TO EMAIL-FORMAT-BAD
               END-IF
               IF DOT-POS <= AT-POS + 1 OR DOT-POS >= EMAIL-LEN
                   MOVE "Y" TO EMAIL-FORMAT-BAD
               END-IF
               IF EMAIL-FORMAT-BAD = "Y"
                   PERFORM ADD-EMAIL-FORMAT
               END-IF
           END-IF.

           IF FUNCTION TRIM(PROFILE-TYPE) = "elderly"
               IF FUNCTION TRIM(ADDRESS-TEXT) = SPACES
                   PERFORM ADD-ADDRESS-REQUIRED
               END-IF
               IF FUNCTION LENGTH(FUNCTION TRIM(ADDRESS-TEXT)) > 500
                   PERFORM ADD-ADDRESS-LENGTH
               END-IF
               IF FUNCTION TRIM(BIRTHDATE-TEXT) NOT = SPACES
                   PERFORM CHECK-BIRTHDATE
               END-IF
               IF FUNCTION TRIM(MEDICAL-TEXT) = SPACES
                   PERFORM ADD-MEDICAL-REQUIRED
               END-IF
               IF FUNCTION LENGTH(FUNCTION TRIM(MEDICAL-TEXT)) > 500
                   PERFORM ADD-MEDICAL-LENGTH
               END-IF
               IF FUNCTION TRIM(ALLERGIES-TEXT) = SPACES
                   PERFORM ADD-ALLERGIES-REQUIRED
               END-IF
               IF FUNCTION LENGTH(FUNCTION TRIM(ALLERGIES-TEXT)) > 300
                   PERFORM ADD-ALLERGIES-LENGTH
               END-IF
               IF FUNCTION TRIM(BLOOD-TEXT) = SPACES
                   PERFORM ADD-BLOOD-REQUIRED
               ELSE
                   IF FUNCTION LENGTH(FUNCTION TRIM(BLOOD-TEXT)) > 10
                       PERFORM ADD-BLOOD-LENGTH
                   END-IF
                   IF FUNCTION TRIM(BLOOD-TEXT) NOT = "A+"
                       AND FUNCTION TRIM(BLOOD-TEXT) NOT = "A-"
                       AND FUNCTION TRIM(BLOOD-TEXT) NOT = "B+"
                       AND FUNCTION TRIM(BLOOD-TEXT) NOT = "B-"
                       AND FUNCTION TRIM(BLOOD-TEXT) NOT = "AB+"
                       AND FUNCTION TRIM(BLOOD-TEXT) NOT = "AB-"
                       AND FUNCTION TRIM(BLOOD-TEXT) NOT = "O+"
                       AND FUNCTION TRIM(BLOOD-TEXT) NOT = "O-"
                       PERFORM ADD-BLOOD-FORMAT
                   END-IF
               END-IF
               IF FUNCTION TRIM(EMERGENCY-NAME) = SPACES
                   PERFORM ADD-EMERGENCY-NAME-REQUIRED
               END-IF
               IF FUNCTION LENGTH(FUNCTION TRIM(EMERGENCY-NAME)) > 100
                   PERFORM ADD-EMERGENCY-NAME-LENGTH
               END-IF
               IF FUNCTION TRIM(EMERGENCY-PHONE) = SPACES
                   PERFORM ADD-EMERGENCY-PHONE-REQUIRED
            ELSE
             IF FUNCTION LENGTH(FUNCTION TRIM(EMERGENCY-PHONE)) NOT = 12
                       PERFORM ADD-EMERGENCY-PHONE-FORMAT
                   ELSE
                       IF EMERGENCY-PHONE(1:3) NOT = "09-"
                           PERFORM ADD-EMERGENCY-PHONE-FORMAT
                       ELSE
               IF FUNCTION TEST-NUMVAL(EMERGENCY-PHONE(4:9)) NOT = 0
                               PERFORM ADD-EMERGENCY-PHONE-FORMAT
                           END-IF
                       END-IF
                   END-IF
               END-IF
           ELSE
               IF FUNCTION TRIM(POSITION-TEXT) = SPACES
                   PERFORM ADD-POSITION-REQUIRED
               END-IF
               IF FUNCTION TRIM(WORK-AREA-TEXT) = SPACES
                   PERFORM ADD-WORK-AREA-REQUIRED
               END-IF
               IF FUNCTION TRIM(HIRE-DATE-TEXT) = SPACES
                   PERFORM ADD-HIRE-DATE-REQUIRED
               END-IF
               IF FUNCTION TRIM(NURSE-STATUS-TEXT) = SPACES
                   PERFORM ADD-NURSE-STATUS-REQUIRED
               END-IF
           END-IF.

           IF FUNCTION TRIM(USERNAME-TEXT) NOT = SPACES
               IF FUNCTION LENGTH(FUNCTION TRIM(USERNAME-TEXT)) < 4
                   PERFORM ADD-USERNAME-LENGTH
               END-IF
           END-IF.

           IF FUNCTION TRIM(PASSWORD-TEXT) NOT = SPACES
               IF FUNCTION LENGTH(FUNCTION TRIM(PASSWORD-TEXT)) < 8
                   PERFORM ADD-PASSWORD-LENGTH
               END-IF
               IF FUNCTION TRIM(PASSWORD-TEXT)
                   NOT = FUNCTION TRIM(CONFIRM-TEXT)
                   PERFORM ADD-CONFIRM-MATCH
               END-IF
           ELSE
               IF FUNCTION TRIM(CONFIRM-TEXT) NOT = SPACES
                   PERFORM ADD-CONFIRM-MATCH
               END-IF
           END-IF.

           IF ERROR-COUNT = 0
               DISPLAY '{"valid":true,"errors":{}}'
           ELSE
               STRING FUNCTION TRIM(OUTPUT-JSON) "}}" DELIMITED BY SIZE
                   INTO OUTPUT-JSON
               DISPLAY FUNCTION TRIM(OUTPUT-JSON)
           END-IF.

           STOP RUN.

       CHECK-PHONE-FORMAT.
           IF FUNCTION LENGTH(FUNCTION TRIM(PHONE-TEXT)) NOT = 12
               PERFORM ADD-PHONE-FORMAT
           ELSE
               IF PHONE-TEXT(1:3) NOT = "09-"
                   PERFORM ADD-PHONE-FORMAT
               ELSE
                   IF FUNCTION TEST-NUMVAL(PHONE-TEXT(4:9)) NOT = 0
                       PERFORM ADD-PHONE-FORMAT
                   END-IF
               END-IF
           END-IF.

       CHECK-BIRTHDATE.
           MOVE "N" TO BIRTHDATE-BAD.
           IF FUNCTION LENGTH(FUNCTION TRIM(BIRTHDATE-TEXT)) NOT = 10
               MOVE "Y" TO BIRTHDATE-BAD
           ELSE
               IF BIRTHDATE-TEXT(5:1) NOT = "-"
                   MOVE "Y" TO BIRTHDATE-BAD
               END-IF
               IF BIRTHDATE-TEXT(8:1) NOT = "-"
                   MOVE "Y" TO BIRTHDATE-BAD
               END-IF
               IF FUNCTION TEST-NUMVAL(BIRTHDATE-TEXT(1:4)) NOT = 0
                   MOVE "Y" TO BIRTHDATE-BAD
               END-IF
               IF FUNCTION TEST-NUMVAL(BIRTHDATE-TEXT(6:2)) NOT = 0
                   MOVE "Y" TO BIRTHDATE-BAD
               END-IF
               IF FUNCTION TEST-NUMVAL(BIRTHDATE-TEXT(9:2)) NOT = 0
                   MOVE "Y" TO BIRTHDATE-BAD
               END-IF
           END-IF.

           IF BIRTHDATE-BAD = "Y"
               PERFORM ADD-BIRTHDATE-FORMAT
           ELSE
               MOVE FUNCTION NUMVAL(BIRTHDATE-TEXT(1:4)) TO BIRTH-YEAR
               MOVE FUNCTION NUMVAL(BIRTHDATE-TEXT(6:2)) TO BIRTH-MONTH
               MOVE FUNCTION NUMVAL(BIRTHDATE-TEXT(9:2)) TO BIRTH-DAY

               IF BIRTH-MONTH < 1 OR BIRTH-MONTH > 12
                   PERFORM ADD-BIRTHDATE-FORMAT
               ELSE
                   IF BIRTH-DAY < 1 OR BIRTH-DAY > 31
                       PERFORM ADD-BIRTHDATE-FORMAT
                   ELSE
                       ACCEPT TODAY-YYYYMMDD FROM DATE YYYYMMDD
                       COMPUTE TODAY-YEAR = TODAY-YYYYMMDD / 10000
                       COMPUTE TODAY-MONTH =
                           FUNCTION MOD(TODAY-YYYYMMDD / 100, 100)
                  COMPUTE TODAY-DAY = FUNCTION MOD(TODAY-YYYYMMDD, 100)
                       COMPUTE BIRTH-YYYYMMDD =
                           (BIRTH-YEAR * 10000)
                           + (BIRTH-MONTH * 100)
                           + BIRTH-DAY

                       IF BIRTH-YYYYMMDD > TODAY-YYYYMMDD
                           PERFORM ADD-BIRTHDATE-FUTURE
                       ELSE
                           COMPUTE BIRTH-AGE = TODAY-YEAR - BIRTH-YEAR
                           IF TODAY-MONTH < BIRTH-MONTH
                               SUBTRACT 1 FROM BIRTH-AGE
                           ELSE
                               IF TODAY-MONTH = BIRTH-MONTH
                                   AND TODAY-DAY < BIRTH-DAY
                                   SUBTRACT 1 FROM BIRTH-AGE
                               END-IF
                           END-IF
                           IF BIRTH-AGE < 50 OR BIRTH-AGE > 120
                               PERFORM ADD-BIRTHDATE-RANGE
                           ELSE
                               IF FUNCTION TEST-NUMVAL(FUNCTION TRIM(AGE-TEXT))
                                   = 0
                                   IF AGE-NUMBER >= 50 AND AGE-NUMBER <= 120
                                       IF AGE-NUMBER NOT = BIRTH-AGE
                                           PERFORM ADD-AGE-BIRTHDATE-MATCH
                                       END-IF
                                   END-IF
                               END-IF
                           END-IF
                       END-IF
                   END-IF
               END-IF
           END-IF.

       ADD-NAME-REQUIRED.
           MOVE '"name":"Full name is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-NAME-LENGTH.
           MOVE '"name":"Full name must be 10 characters or fewer."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-NAME-SPACES.
           MOVE '"name":"Full name cannot start with a space."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-NAME-LETTER.
           MOVE '"name":"Full name must contain at least one letter."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-AGE-REQUIRED.
           MOVE '"age":"Age is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-AGE-NUMBER.
           MOVE '"age":"Age must be a number."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-AGE-RANGE-ELDERLY.
           MOVE '"age":"Elderly age must be between 50 and 120."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-AGE-RANGE-NURSE.
           MOVE '"age":"Caregiver age must be between 18 and 80."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-AGE-BIRTHDATE-MATCH.
           MOVE '"age":"Age must match birthdate."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-GENDER-REQUIRED.
           MOVE '"gender":"Gender is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-PHONE-FORMAT.
           MOVE '"phone":"Phone must use format 09-#########."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-PHONE-REQUIRED.
           MOVE '"phone":"Phone is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-EMAIL-LENGTH.
           MOVE '"email":"Email must be 160 characters or fewer."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-EMAIL-FORMAT.
           MOVE '"email":"Use format name@gmail.com."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-ADDRESS-REQUIRED.
           MOVE '"address":"Address is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-ADDRESS-LENGTH.
           MOVE '"address":"Address must be 500 characters or fewer."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-BIRTHDATE-FORMAT.
           MOVE '"birthdate":"Enter a valid birthdate."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-BIRTHDATE-FUTURE.
           MOVE '"birthdate":"Birthdate cannot be in the future."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-BIRTHDATE-RANGE.
           MOVE '"birthdate":"Age from birthdate must be 50 to 120."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-MEDICAL-REQUIRED.
           MOVE '"medicalCondition":"Medical conditions are required."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-MEDICAL-LENGTH.
           MOVE '"medicalCondition":"Must be 500 chars or fewer."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-ALLERGIES-REQUIRED.
           MOVE '"allergies":"Allergies are required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-ALLERGIES-LENGTH.
           MOVE 
           '"allergies":"Allergies must be 300 characters or fewer."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-BLOOD-REQUIRED.
           MOVE '"bloodType":"Blood type is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-BLOOD-LENGTH.
           MOVE
            '"bloodType":"Blood type must be 10 characters or fewer."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-BLOOD-FORMAT.
           MOVE 
           '"bloodType":"Use A, B, AB, or O with + or -."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-EMERGENCY-NAME-REQUIRED.
           MOVE '"emergencyName":"Emergency contact name is required."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-EMERGENCY-NAME-LENGTH.
           MOVE 
           '"emergencyName":"Must be 100 chars or fewer."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-EMERGENCY-PHONE-REQUIRED.
           MOVE '"emergencyPhone":"Emergency phone is required."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-EMERGENCY-PHONE-FORMAT.
           MOVE
           '"emergencyPhone":"Use format 09-#########."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-POSITION-REQUIRED.
           MOVE '"position":"Position is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-WORK-AREA-REQUIRED.
           MOVE '"workArea":"Work area is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-HIRE-DATE-REQUIRED.
           MOVE '"hireDate":"Hire date is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-NURSE-STATUS-REQUIRED.
           MOVE '"nurseStatus":"Nurse status is required."'
            TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-USERNAME-LENGTH.
           MOVE '"username":"Username must be at least 4 characters."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-PASSWORD-LENGTH.
           MOVE '"password":"Password must be at least 8 characters."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-CONFIRM-MATCH.
           MOVE '"confirmPassword":"Passwords must match."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       APPEND-ERROR.
           IF ERROR-COUNT > 0
               STRING FUNCTION TRIM(OUTPUT-JSON) ","
                   FUNCTION TRIM(FIELD-ERROR)
                   DELIMITED BY SIZE INTO OUTPUT-JSON
           ELSE
               STRING FUNCTION TRIM(OUTPUT-JSON)
                   FUNCTION TRIM(FIELD-ERROR)
                   DELIMITED BY SIZE INTO OUTPUT-JSON
           END-IF.
           ADD 1 TO ERROR-COUNT.
