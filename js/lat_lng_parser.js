// Holds a function for parsing lat/lon coordinates as user input into
// floating-point numbers that can be used in the app.
var LatLngParser = {

    TokenType: {
        LAT_SIGN: 1,
        LON_SIGN: 2,
        UNKNOWN_NUMBER: 3,
        DEGREES: 4,
        MINUTES: 5,
        SECONDS: 6,
        SEPARATOR: 7
    },

    // Returns a valid LatLng point if the input string is able to be
    // parsed into coordinates, returns null otherwise.
    parse: function(input) {
        input = input.trim().toUpperCase();

        // Tokenize the input.
        var tokenCfg = {
            tokenTypes: [],
            tokens: []
        };
        if(!this.tokenizeLatLngCoords(input, tokenCfg)) {
            return null;
        }

        // Massage the tokens to make sure the input is correct.
        if(!this.addSeparators(tokenCfg)) {
            return null;
        }
        if(!this.resolveUnknownsIfNeeded(tokenCfg)) {
            return null;
        }

        // Extract coordinates from the tokens.
        var latLng;
        if((latLng = this.extractLatLngFromTokens(tokenCfg)) == null) {
            return null;
        }

        // Validate the coordinates.
        if(!this.validate(latLng)) {
            return null;
        }

        return latLng;
    },

    tokenizeLatLngCoords: function(input, tokenCfg) {
        var currentToken = '';
        var currentTokenType = null;

        for(var i = 0; i < input.length; ++i) {
            var ch = input[i];

            if(ch.match(/[A-z]/)) {
                if(ch == 'N' || ch == 'S' || ch == 'E' || ch == 'W') {
                    if(ch == 'N' || ch == 'S') {
                        tokenCfg.tokenTypes.push(this.TokenType.LAT_SIGN);
                    }
                    else {
                        tokenCfg.tokenTypes.push(this.TokenType.LON_SIGN);
                    }

                    if(ch == 'N' || ch == 'E') {
                        tokenCfg.tokens.push(1);
                    }
                    else {
                        tokenCfg.tokens.push(-1);
                    }
                }
                else {
                    // Failed to tokenize the input.
                    return false;
                }
            }
            else if(ch.match(/[0-9\.]/)) {
                currentToken += ch;
                currentTokenType = this.TokenType.UNKNOWN_NUMBER;
            }
            else if(ch.match(/\s/)) {
                if(currentTokenType == this.TokenType.UNKNOWN_NUMBER) {
                    tokenCfg.tokenTypes.push(this.TokenType.UNKNOWN_NUMBER);
                    tokenCfg.tokens.push(currentToken);

                    currentTokenType = null;
                    currentToken = '';
                }
            }
            else if(ch == '°' && currentTokenType == this.TokenType.UNKNOWN_NUMBER) {
                tokenCfg.tokenTypes.push(this.TokenType.DEGREES);
                tokenCfg.tokens.push(currentToken);

                currentTokenType = null;
                currentToken = '';
            }
            else if(ch == '\'' && currentTokenType == this.TokenType.UNKNOWN_NUMBER) {
                tokenCfg.tokenTypes.push(this.TokenType.MINUTES);
                tokenCfg.tokens.push(currentToken);

                currentTokenType = null;
                currentToken = '';
            }
            else if(ch == '\"' && currentTokenType == this.TokenType.UNKNOWN_NUMBER) {
                tokenCfg.tokenTypes.push(this.TokenType.SECONDS);
                tokenCfg.tokens.push(currentToken);

                currentTokenType = null;
                currentToken = '';
            }
            else if(ch == ',') {
                if(currentTokenType == this.TokenType.UNKNOWN_NUMBER) {
                    tokenCfg.tokenTypes.push(this.TokenType.UNKNOWN_NUMBER);
                    tokenCfg.tokens.push(currentToken);
                }

                tokenCfg.tokenTypes.push(this.TokenType.SEPARATOR);
                tokenCfg.tokens.push(null);

                currentTokenType = null;
                currentToken = '';
            }
            else if(ch.match(/[+\-]/)) {
                tokenCfg.tokenTypes.push((i == 0) ? this.TokenType.LAT_SIGN : this.TokenType.LON_SIGN);
                tokenCfg.tokens.push(ch == '+' ? 1 : -1);
            }
            else {
                // Failed to tokenize the input.
                return false;
            }
        }

        if(currentTokenType != null) {
            tokenCfg.tokenTypes.push(currentTokenType);
            tokenCfg.tokens.push(currentToken);
        }

        return true;
    },

    // Tries to insert a SEPARATOR token in the proper place (if necessary). It also appends a SEPARATOR token
    // to the end, to make the list more consistent and easier to parse.
    addSeparators: function(tokenCfg) {
        if(tokenCfg.tokenTypes.indexOf(this.TokenType.SEPARATOR) < 0) {
            if(tokenCfg.tokenTypes.indexOf(this.TokenType.UNKNOWN_NUMBER) < 0) {
                var foundLatDegrees = false,
                    foundLonDegrees = false;
                for(var i = 0; i < tokenCfg.tokenTypes.length; ++i) {
                    var tokenType = tokenCfg.tokenTypes[i];
                    if(tokenType == this.TokenType.DEGREES || tokenType == this.TokenType.LON_SIGN) {
                        if(foundLatDegrees) {
                            foundLonDegrees = true;
                            tokenCfg.tokenTypes.push(i, this.TokenType.SEPARATOR);
                            tokenCfg.tokens.push(i, null);
                            break;
                        }
                        else {
                            foundLatDegrees = true;
                        }
                    }
                }

                if(!foundLatDegrees || !foundLonDegrees) {
                    return false;
                }
            }
            else {
                // We just have a bunch of unknown numbers, so try to convert them into degrees/minutes/seconds.
                var numUnknownNumbers = 0;
                for(var i = 0; i < tokenCfg.tokenTypes.length; ++i) {
                    var tt = tokenCfg.tokenTypes[i];
                    if(tt == this.TokenType.UNKNOWN_NUMBER) {
                        ++numUnknownNumbers;
                    }
                }

                if(numUnknownNumbers % 2 != 0) {
                    // It should have an even number of numbers;
                    return false;
                }

                var numLatitudeNumbers = 0;
                numUnknownNumbers /= 2;
                for(var i = 0; i < tokenCfg.tokenTypes.length; ++i) {
                    var tt = tokenCfg.tokenTypes[i];
                    if(tt == this.TokenType.UNKNOWN_NUMBER) {
                        if(++numLatitudeNumbers == numUnknownNumbers) {
                            // We found the middle of the unknown numbers, so
                            // let's add a separator.
                            tokenCfg.tokenTypes.push(i+1, this.TokenType.SEPARATOR);
                            tokenCfg.tokens.push(i+1, null);
                            break;
                        }
                    }
                }
            }
        }

        // Add a separator at the end to make it easy to set the latitude
        // and longitude in the same place.
        tokenCfg.tokenTypes.push(this.TokenType.SEPARATOR);
        tokenCfg.tokens.push(null);

        return true;
    },

    resolveUnknownsIfNeeded: function(tokenCfg) {
        if(tokenCfg.tokenTypes.indexOf(this.TokenType.UNKNOWN_NUMBER) < 0) {
            return true;
        }

        var degreesSet = false,
            minutesSet = false,
            secondsSet = false;
        for(var i = 0; i < tokenCfg.tokenTypes.length; ++i) {
            var tt = tokenCfg.tokenTypes[i];
            if(tt == this.TokenType.UNKNOWN_NUMBER) {
                if(!degreesSet) {
                    tokenCfg.tokenTypes[i] = this.TokenType.DEGREES;
                    degreesSet = true;
                }
                else if(!minutesSet) {
                    tokenCfg.tokenTypes[i] = this.TokenType.MINUTES;
                    minutesSet = true;
                }
                else if(!secondsSet) {
                    tokenCfg.tokenTypes[i] = this.TokenType.SECONDS;
                    secondsSet = true;
                }
                else {
                    // We've apparently hit another unknown number before the separator
                    // and have already set the degrees, minutes and seconds.
                    return false;
                }
            }
            else if(tt == this.TokenType.SEPARATOR) {
                degreesSet = minutesSet = secondsSet = false;
            }
            else if(tt == this.TokenType.DEGREES || tt == this.TokenType.MINUTES || tt == this.TokenType.SECONDS) {
                // There should not be unknown and known numbers in the same input.
                return false;
            }
        }

        return true;
    },

    extractLatLngFromTokens: function(tokenCfg) {
        var  sign = 1;
        var  degrees = null,
             minutes = null,
             seconds = null;

        var  latitude = null,
             longitude = null;

        for(var i = 0; i < tokenCfg.tokenTypes.length; ++i) {
            var tokenType = tokenCfg.tokenTypes[i];
            var token = tokenCfg.tokens[i];

            if(tokenType == this.TokenType.LAT_SIGN || tokenType == this.TokenType.LON_SIGN) {
                sign = token;
            }
            else if(tokenType == this.TokenType.UNKNOWN_NUMBER) {
                if(degrees == null) {
                    degrees = parseFloat(token);
                }
                else if(minutes == null) {
                    minutes = parseFloat(token);
                }
                else if(seconds == null) {
                    seconds = parseFloat(token);
                }
            }
            else if(tokenType == this.TokenType.DEGREES) {
                degrees = parseFloat(token);
            }
            else if(tokenType == this.TokenType.MINUTES) {
                minutes = parseFloat(token);
            }
            else if(tokenType == this.TokenType.SECONDS) {
                seconds = parseFloat(token);
            }
            else if(tokenType == this.TokenType.SEPARATOR) {
                if(latitude == null) {
                    if(degrees == null) {
                        return null;
                    }

                    if(minutes != null) {
                        degrees += minutes / 60.0;
                        if(seconds != null) {
                            degrees += seconds / 3600.0;
                        }
                    }
                    else if(seconds != null) {
                        return null;
                    }

                    latitude = degrees * sign;
                    degrees = minutes = seconds = null;
                    sign = 1;
                }
                else if(longitude == null) {
                    if(degrees == null) {
                        return null;
                    }

                    if(minutes != null) {
                        degrees += minutes / 60.0;
                        if(seconds != null) {
                            degrees += seconds / 3600.0;
                        }
                    }
                    else if(seconds != null) {
                        return null;
                    }

                    longitude = degrees * sign;
                    degrees = minutes = seconds = null;
                }
                else {
                    return null;
                }
            }
        }

        if(latitude == null || longitude == null) {
            return null;
        }

        return {
            latitude: latitude,
            longitude: longitude
        };
    },

    validate: function(latLng) {
        return latLng.latitude >= -90 && latLng.latitude <= 90
            && latLng.longitude >= -180 && latLng.longitude <= 180;
    }

};