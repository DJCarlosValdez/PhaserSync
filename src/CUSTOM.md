# Customizing PhaserSync

## Changing file icons

To change file icons you need to add 'em to the fileIcons folder.
Then change map.json to add the icon's path and assign extensions to them.
If there's multiple icons that are linked to a same file extension, the last one will always override the rest. 

If you want the images icon to be the download. Add the following to map.json:
(This overrides extensions and path values)

```json
{
    "images" : {
        dynamic: true
    }
}
```

**NOTICE!** The default icon doesn't accept any extensions, it can be an empty array

**WARNING!** There must always be a default icon! If there's no default icon present, the query to get your beautiful icons won't run 😔
**WARNING!** The app only reads icons from fileIcons! DO NOT MODIFY OR DELETE THE FOLDER!


