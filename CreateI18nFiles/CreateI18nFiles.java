import java.io.*;
import javax.xml.parsers.*;
import org.w3c.dom.*;
import org.json.*;


// This class converts the strings.xml files from Android into messages.json files
// that are used in Chrome extensions.
//
// It converts regular messages:
// 
// Android:
//  <string name="key">value</string>
// 
// Chrome:
//  "key": {
//    "message": "value",
//    "description": ""
//  }
//
// 
// It converts plural messages:
//
// Android:
//  <plurals name="key">
//    <item quantity="one">$1%d value</item>
//    <item quantity="other">$1%d values</item>
//  </plurals>
//
// Chrome:
//  "key_singular": {
//    "message": "$1 value",
//    "description": ""
//  },
//  "key_plural": {
//    "message": "$1 values",
//    "description": ""
//  }
//
public class CreateI18nFiles {

  private static final String[] ANDROID_STRINGS = new String[] {
    "ok",
    "cancel",
    "yes",
    "no",
    "delete",
    "undo"
  };

  public static void main(String[] args) throws Exception {
    String projectLocation = args[0];
    String androidSDKLocation = args[1];

    File file = new File("CreateI18nFiles.properties");
    BufferedReader br = new BufferedReader(new FileReader(file));
    String line;
    while((line = br.readLine()) != null) {
      String[] prop = line.split("=");
      String chromeFolderName = prop[0];
      String androidFolderName = prop[1];

      JSONObject chromeMessagesObj = new JSONObject();
      populateMessagesFromAppStrings(chromeMessagesObj, projectLocation, androidFolderName);
      populateMessagesFromAndroidStrings(chromeMessagesObj, androidSDKLocation, androidFolderName);
      writeMessagesToFile(chromeMessagesObj, chromeFolderName);
    }
  }

  private static void populateMessagesFromAppStrings(JSONObject chromeMessagesObj, String projectLocation, String androidFolderName) throws Exception {
    File androidFile = new File(projectLocation + "/res/" + androidFolderName + "/strings.xml");
    DocumentBuilder db = DocumentBuilderFactory.newInstance().newDocumentBuilder();
    Document doc = db.parse(androidFile);
    
    boolean convertedAppName = false;

    // Convert regular messages.
    NodeList nodeList = doc.getElementsByTagName("string");
    for (int i = 0; i < nodeList.getLength(); ++i) {
      Element element = (Element) nodeList.item(i);
      String key = element.getAttribute("name");
      if(!convertedAppName && "app_name".equals(key)) {
        convertedAppName = true;
      }

      JSONObject messageObj = new JSONObject();
      messageObj.put("message", convertMessageValue(element.getTextContent()));
      messageObj.put("description", "");
      chromeMessagesObj.put(key, messageObj);
    }

    // Convert plural messages.
    nodeList = doc.getElementsByTagName("plurals");
    for(int i = 0; i < nodeList.getLength(); ++i) {
      Element element = (Element) nodeList.item(i);
      String key = element.getAttribute("name");

      NodeList itemsNodeList = element.getElementsByTagName("item");
      Element singularElement;
      Element pluralElement;
      if("one".equalsIgnoreCase(((Element) itemsNodeList.item(0)).getAttribute("quantity"))) {
        singularElement = (Element) itemsNodeList.item(0);
        pluralElement = (Element) itemsNodeList.item(1);
      }
      else {
        pluralElement = (Element) itemsNodeList.item(0);
        singularElement = (Element) itemsNodeList.item(1);
      }

      JSONObject singularMessageObj = new JSONObject();
      singularMessageObj.put("message", convertMessageValue(singularElement.getTextContent()));
      singularMessageObj.put("description", "");
      chromeMessagesObj.put(key + "_singular", singularMessageObj);

      JSONObject pluralMessageObj = new JSONObject();
      pluralMessageObj.put("message", convertMessageValue(pluralElement.getTextContent()));
      pluralMessageObj.put("description", "");
      chromeMessagesObj.put(key + "_plural", pluralMessageObj);
    }
    
    if(!convertedAppName) {
      JSONObject messageObj = new JSONObject();
      messageObj.put("message", "ScoutLog");
      messageObj.put("description", "");
      chromeMessagesObj.put("app_name", messageObj);
    }
  }

  private static void populateMessagesFromAndroidStrings(JSONObject chromeMessagesObj, String androidSDKLocation, String androidFolderName) throws Exception {
    File androidFile = new File(androidSDKLocation + "/data/res/" + androidFolderName + "/strings.xml");
    DocumentBuilder db = DocumentBuilderFactory.newInstance().newDocumentBuilder();
    Document doc = db.parse(androidFile);

    // Convert list of strings.
    NodeList nodeList = doc.getElementsByTagName("string");
    for (int i = 0; i < nodeList.getLength(); ++i) {
      Element element = (Element) nodeList.item(i);
      String key = element.getAttribute("name");
      for(String str : ANDROID_STRINGS) {
        if(key.equalsIgnoreCase(str)) {
          JSONObject messageObj = new JSONObject();
          messageObj.put("message", convertMessageValue(element.getTextContent()));
          messageObj.put("description", "");
          chromeMessagesObj.put(key, messageObj);
          break;
        }
      }
    }
  }

  private static void writeMessagesToFile(JSONObject chromeMessagesObj, String chromeFolderName) throws Exception {
    File chromeLangFolder = new File("../_locales/" + chromeFolderName);
    if(!chromeLangFolder.exists()) {
      chromeLangFolder.mkdirs();
    }
    File chromeFile = new File(chromeLangFolder.getAbsolutePath() + "/messages.json");
    PrintWriter chromeFileWriter = new PrintWriter(new OutputStreamWriter(new FileOutputStream(chromeFile, false), "UTF-8"));
    chromeFileWriter.print(chromeMessagesObj.toString(2));
    chromeFileWriter.close();
  }

  private static String convertMessageValue(String value) {
    value = value.replaceAll("%(\\d+)\\$[ds]", "\\$$1");
    value = value.replaceAll("\\\\'", "'");
    value = value.replaceAll("\\\\\"", "\"");
    value = value.replaceAll("\\\\n", "<br>");
    value = value.replaceAll("\\u2026", "...");
    return value;
  }

}