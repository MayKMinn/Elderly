       IDENTIFICATION DIVISION.
       PROGRAM-ID. NURSE-VALIDATE.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  PROFILE-TYPE          PIC X(20).
       01  FULL-NAME             PIC X(120).
       01  AGE-TEXT              PIC X(10).
       01  GENDER-TEXT           PIC X(30).
       01  PHONE-TEXT            PIC X(40).
       01  EMAIL-TEXT            PIC X(160).
       01  ADDRESS-TEXT          PIC X(500).
       01  LICENSE-NUMBER-TEXT   PIC X(80).
       01  POSITION-TEXT         PIC X(80).
       01  WORK-AREA-TEXT        PIC X(80).
       01  HIRE-DATE-TEXT        PIC X(80).
       01  NURSE-STATUS-TEXT     PIC X(40).
       01  USERNAME-TEXT         PIC X(80).
       01  PASSWORD-TEXT         PIC X(80).
       01  CONFIRM-TEXT          PIC X(80).
       01  AVATAR-TEXT           PIC X(500).

       01  AGE-NUMBER            PIC 9(3) VALUE 0.
       01  ERROR-COUNT           PIC 9(3) VALUE 0.
       01  FIELD-ERROR           PIC X(512) VALUE SPACES.
       01  OUTPUT-JSON           PIC X(4096) VALUE SPACES.

       01  NAME-IDX              PIC 9(3) VALUE 1.
       01  LETTER-COUNT          PIC 9(3) VALUE 0.
       01  NAME-BAD              PIC X VALUE "N".

       01  EMAIL-IDX             PIC 9(3) VALUE 1.
       01  EMAIL-LEN             PIC 9(3) VALUE 0.
       01  AT-COUNT              PIC 9(3) VALUE 0.
       01  DOT-COUNT             PIC 9(3) VALUE 0.
       01  AT-POS                PIC 9(3) VALUE 0.
       01  DOT-POS               PIC 9(3) VALUE 0.
       01  EMAIL-FORMAT-BAD      PIC X VALUE "N".

       01  LICENSE-IDX           PIC 9(3) VALUE 1.
       01  LICENSE-LEN           PIC 9(3) VALUE 0.
       01  LICENSE-BAD           PIC X VALUE "N".

       01  USERNAME-IDX          PIC 9(3) VALUE 1.
       01  USERNAME-LEN          PIC 9(3) VALUE 0.
       01  USERNAME-BAD          PIC X VALUE "N".

       01  HIRE-DATE-BAD         PIC X VALUE "N".
       01  TODAY-YYYYMMDD        PIC 9(8) VALUE 0.
       01  HIRE-YEAR             PIC 9(4) VALUE 0.
       01  HIRE-MONTH            PIC 9(2) VALUE 0.
       01  HIRE-DAY              PIC 9(2) VALUE 0.
       01  HIRE-YYYYMMDD         PIC 9(8) VALUE 0.

       PROCEDURE DIVISION.
           ACCEPT PROFILE-TYPE.
           ACCEPT FULL-NAME.
           ACCEPT AGE-TEXT.
           ACCEPT GENDER-TEXT.
           ACCEPT PHONE-TEXT.
           ACCEPT EMAIL-TEXT.
           ACCEPT ADDRESS-TEXT.
           ACCEPT LICENSE-NUMBER-TEXT.
           ACCEPT POSITION-TEXT.
           ACCEPT WORK-AREA-TEXT.
           ACCEPT HIRE-DATE-TEXT.
           ACCEPT NURSE-STATUS-TEXT.
           ACCEPT USERNAME-TEXT.
           ACCEPT PASSWORD-TEXT.
           ACCEPT CONFIRM-TEXT.
           ACCEPT AVATAR-TEXT.

           MOVE '{"valid":false,"errors":{' TO OUTPUT-JSON.

           IF FUNCTION TRIM(FULL-NAME) = SPACES
               PERFORM ADD-NAME-REQUIRED
           ELSE
               MOVE 0 TO LETTER-COUNT
               MOVE "N" TO NAME-BAD
               PERFORM VARYING NAME-IDX FROM 1 BY 1
             UNTIL NAME-IDX > FUNCTION LENGTH(FUNCTION TRIM(FULL-NAME))
                   IF (FULL-NAME(NAME-IDX:1) >= "A"
                       AND FULL-NAME(NAME-IDX:1) <= "Z")
                       OR (FULL-NAME(NAME-IDX:1) >= "a"
                       AND FULL-NAME(NAME-IDX:1) <= "z")
                       ADD 1 TO LETTER-COUNT
                   ELSE
                       IF FULL-NAME(NAME-IDX:1) NOT = SPACE
                           MOVE "Y" TO NAME-BAD
                       END-IF
                   END-IF
               END-PERFORM
               IF LETTER-COUNT = 0 OR NAME-BAD = "Y"
                   PERFORM ADD-NAME-LETTER
               END-IF
           END-IF.

           IF FUNCTION TRIM(AGE-TEXT) = SPACES
               PERFORM ADD-AGE-REQUIRED
           ELSE
               IF FUNCTION TEST-NUMVAL(FUNCTION TRIM(AGE-TEXT)) = 0
                   MOVE FUNCTION NUMVAL(AGE-TEXT) TO AGE-NUMBER
                   IF AGE-NUMBER < 18 OR AGE-NUMBER > 80
                       PERFORM ADD-AGE-RANGE-NURSE
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

           IF FUNCTION TRIM(EMAIL-TEXT) = SPACES
               PERFORM ADD-EMAIL-REQUIRED
           ELSE
               PERFORM CHECK-EMAIL-FORMAT
           END-IF.

           IF FUNCTION TRIM(ADDRESS-TEXT) = SPACES
               PERFORM ADD-ADDRESS-REQUIRED
           END-IF.

           IF FUNCTION TRIM(LICENSE-NUMBER-TEXT) = SPACES
               PERFORM ADD-LICENSE-REQUIRED
           ELSE
               PERFORM CHECK-LICENSE-FORMAT
           END-IF.

           IF FUNCTION TRIM(POSITION-TEXT) = SPACES
               PERFORM ADD-POSITION-REQUIRED
           END-IF.

           IF FUNCTION TRIM(WORK-AREA-TEXT) = SPACES
               PERFORM ADD-WORK-AREA-REQUIRED
           END-IF.

           IF FUNCTION TRIM(HIRE-DATE-TEXT) = SPACES
               PERFORM ADD-HIRE-DATE-REQUIRED
           ELSE
               PERFORM CHECK-HIRE-DATE
           END-IF.

           IF FUNCTION TRIM(NURSE-STATUS-TEXT) = SPACES
               PERFORM ADD-NURSE-STATUS-REQUIRED
           END-IF.

           IF FUNCTION TRIM(USERNAME-TEXT) = SPACES
               PERFORM ADD-USERNAME-REQUIRED
           ELSE
               PERFORM CHECK-USERNAME-FORMAT
           END-IF.

           IF FUNCTION TRIM(PASSWORD-TEXT) = SPACES
               PERFORM ADD-PASSWORD-REQUIRED
           ELSE
               IF FUNCTION LENGTH(FUNCTION TRIM(PASSWORD-TEXT)) < 8
                   PERFORM ADD-PASSWORD-LENGTH
               END-IF
           END-IF.

           IF FUNCTION TRIM(CONFIRM-TEXT) NOT = SPACES
               IF FUNCTION TRIM(PASSWORD-TEXT)
                   NOT = FUNCTION TRIM(CONFIRM-TEXT)
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

       CHECK-EMAIL-FORMAT.
           MOVE "N" TO EMAIL-FORMAT-BAD.
           MOVE FUNCTION LENGTH(FUNCTION TRIM(EMAIL-TEXT)) TO EMAIL-LEN.
           MOVE 0 TO AT-COUNT.
           MOVE 0 TO DOT-COUNT.
           MOVE 0 TO AT-POS.
           MOVE 0 TO DOT-POS.

           INSPECT EMAIL-TEXT TALLYING AT-COUNT FOR ALL "@".
           INSPECT EMAIL-TEXT TALLYING DOT-COUNT FOR ALL ".".

           PERFORM VARYING EMAIL-IDX FROM 1 BY 1
               UNTIL EMAIL-IDX > EMAIL-LEN
               IF EMAIL-TEXT(EMAIL-IDX:1) = "@"
                   MOVE EMAIL-IDX TO AT-POS
               END-IF
               IF EMAIL-TEXT(EMAIL-IDX:1) = "."
                   MOVE EMAIL-IDX TO DOT-POS
               END-IF
           END-PERFORM.

           IF EMAIL-LEN > 160
               PERFORM ADD-EMAIL-LENGTH
           END-IF.

           IF AT-COUNT NOT = 1 OR DOT-COUNT < 1
               MOVE "Y" TO EMAIL-FORMAT-BAD
           END-IF.

           IF NOT ((EMAIL-TEXT(1:1) >= "A"
               AND EMAIL-TEXT(1:1) <= "Z")
               OR (EMAIL-TEXT(1:1) >= "a"
               AND EMAIL-TEXT(1:1) <= "z"))
               MOVE "Y" TO EMAIL-FORMAT-BAD
           END-IF.

           IF AT-POS <= 1
               MOVE "Y" TO EMAIL-FORMAT-BAD
           END-IF.

           IF DOT-POS <= AT-POS + 1 OR DOT-POS >= EMAIL-LEN
               MOVE "Y" TO EMAIL-FORMAT-BAD
           END-IF.

           IF EMAIL-FORMAT-BAD = "Y"
               PERFORM ADD-EMAIL-FORMAT
           END-IF.

       CHECK-LICENSE-FORMAT.
           MOVE "N" TO LICENSE-BAD.
           MOVE FUNCTION LENGTH(FUNCTION TRIM(LICENSE-NUMBER-TEXT))
               TO LICENSE-LEN.

           IF LICENSE-LEN NOT = 7
               MOVE "Y" TO LICENSE-BAD
           END-IF.

           PERFORM VARYING LICENSE-IDX FROM 1 BY 1
               UNTIL LICENSE-IDX > LICENSE-LEN
               IF LICENSE-NUMBER-TEXT(LICENSE-IDX:1) < "0"
                   OR LICENSE-NUMBER-TEXT(LICENSE-IDX:1) > "9"
                   MOVE "Y" TO LICENSE-BAD
               END-IF
           END-PERFORM.

           IF LICENSE-BAD = "Y"
               PERFORM ADD-LICENSE-FORMAT
           END-IF.

       CHECK-USERNAME-FORMAT.
           MOVE "N" TO USERNAME-BAD.
           MOVE FUNCTION LENGTH(FUNCTION TRIM(USERNAME-TEXT))
               TO USERNAME-LEN.

           IF USERNAME-LEN < 4
               PERFORM ADD-USERNAME-LENGTH
           END-IF.

           PERFORM VARYING USERNAME-IDX FROM 1 BY 1
               UNTIL USERNAME-IDX > USERNAME-LEN
               IF NOT ((USERNAME-TEXT(USERNAME-IDX:1) >= "A"
                   AND USERNAME-TEXT(USERNAME-IDX:1) <= "Z")
                   OR (USERNAME-TEXT(USERNAME-IDX:1) >= "a"
                   AND USERNAME-TEXT(USERNAME-IDX:1) <= "z"))
                   MOVE "Y" TO USERNAME-BAD
               END-IF
           END-PERFORM.

           IF USERNAME-BAD = "Y"
               PERFORM ADD-USERNAME-FORMAT
           END-IF.

       CHECK-HIRE-DATE.
           MOVE "N" TO HIRE-DATE-BAD.

           IF FUNCTION LENGTH(FUNCTION TRIM(HIRE-DATE-TEXT)) NOT = 10
               MOVE "Y" TO HIRE-DATE-BAD
           ELSE
               IF HIRE-DATE-TEXT(5:1) NOT = "-"
                   MOVE "Y" TO HIRE-DATE-BAD
               END-IF
               IF HIRE-DATE-TEXT(8:1) NOT = "-"
                   MOVE "Y" TO HIRE-DATE-BAD
               END-IF
               IF FUNCTION TEST-NUMVAL(HIRE-DATE-TEXT(1:4)) NOT = 0
                   MOVE "Y" TO HIRE-DATE-BAD
               END-IF
               IF FUNCTION TEST-NUMVAL(HIRE-DATE-TEXT(6:2)) NOT = 0
                   MOVE "Y" TO HIRE-DATE-BAD
               END-IF
               IF FUNCTION TEST-NUMVAL(HIRE-DATE-TEXT(9:2)) NOT = 0
                   MOVE "Y" TO HIRE-DATE-BAD
               END-IF
           END-IF.

           IF HIRE-DATE-BAD = "Y"
               PERFORM ADD-HIRE-DATE-FORMAT
           ELSE
               MOVE FUNCTION NUMVAL(HIRE-DATE-TEXT(1:4)) TO HIRE-YEAR
               MOVE FUNCTION NUMVAL(HIRE-DATE-TEXT(6:2)) TO HIRE-MONTH
               MOVE FUNCTION NUMVAL(HIRE-DATE-TEXT(9:2)) TO HIRE-DAY

               IF HIRE-MONTH < 1 OR HIRE-MONTH > 12
                   PERFORM ADD-HIRE-DATE-FORMAT
               ELSE
                   IF HIRE-DAY < 1 OR HIRE-DAY > 31
                       PERFORM ADD-HIRE-DATE-FORMAT
                   ELSE
                       ACCEPT TODAY-YYYYMMDD FROM DATE YYYYMMDD
                       COMPUTE HIRE-YYYYMMDD =
                           (HIRE-YEAR * 10000)
                           + (HIRE-MONTH * 100)
                           + HIRE-DAY
                       IF HIRE-YYYYMMDD > TODAY-YYYYMMDD
                           PERFORM ADD-HIRE-DATE-FUTURE
                       END-IF
                   END-IF
               END-IF
           END-IF.

       ADD-NAME-REQUIRED.
           MOVE '"name":"Full name is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-NAME-LETTER.
           MOVE '"name":"Full name must contain letters only."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-AGE-REQUIRED.
           MOVE '"age":"Age is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-AGE-NUMBER.
           MOVE '"age":"Age must be a number."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-AGE-RANGE-NURSE.
           MOVE '"age":"Caregiver age must be between 18 and 80."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-GENDER-REQUIRED.
           MOVE '"gender":"Gender is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-PHONE-REQUIRED.
           MOVE '"phone":"Phone is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-PHONE-FORMAT.
           MOVE '"phone":"Phone must use format 09-#########."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-EMAIL-REQUIRED.
           MOVE '"email":"Email is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-EMAIL-LENGTH.
           MOVE '"email":"Email must be 160 characters or fewer."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-EMAIL-FORMAT.
           MOVE '"email":"Email must include @ and a valid domain."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-ADDRESS-REQUIRED.
           MOVE '"address":"Address is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-LICENSE-REQUIRED.
           MOVE '"licenseNumber":"License number is required."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-LICENSE-FORMAT.
           MOVE '"licenseNumber":"License number must be 7 digits."'
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

       ADD-HIRE-DATE-FORMAT.
           MOVE '"hireDate":"Enter a valid hire date."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-HIRE-DATE-FUTURE.
           MOVE '"hireDate":"Hire date cannot be in the future."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-NURSE-STATUS-REQUIRED.
           MOVE '"nurseStatus":"Nurse status is required."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-USERNAME-REQUIRED.
           MOVE '"username":"Username is required."' TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-USERNAME-LENGTH.
           MOVE '"username":"Username must be at least 4 characters."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-USERNAME-FORMAT.
           MOVE '"username":"Username must contain letters only."'
               TO FIELD-ERROR.
           PERFORM APPEND-ERROR.

       ADD-PASSWORD-REQUIRED.
           MOVE '"password":"Password is required."' TO FIELD-ERROR.
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
